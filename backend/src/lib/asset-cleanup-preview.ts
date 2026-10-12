import type { ListObjectsV2CommandInput, ListObjectsV2Output } from "@aws-sdk/client-s3"
import type { GraphResultSet, RemoteQueryInput } from "@medusajs/framework/types"

// Reserved for a future provider that enforces public/private write isolation.
// Existing uploads are legacy: never expand this to an empty or bucket-wide prefix.
export const PUBLIC_ASSET_PREFIX = "public-assets/"
export const ASSET_RETENTION_DAYS = 30
const PAGE_SIZE = 250
const MAX_PAGES = 100
const IMAGE_EXTENSION = /\.(jpe?g|png|gif|webp|svg|avif)$/i
const URL_FIELDS = new Set(["url", "imageUrl", "image_url", "thumbnail", "src", "photo_url"])
const FILE_FIELDS = new Set(["file_id", "fileId", "file_key", "fileKey"])
const ARRAY_FIELDS = new Set(["story_sections", "detail_sections", "images", "portrait_photos", "photos"])
const OBJECT_FIELDS = new Set(["metadata", "line_item_metadata", "portrait"])

const SOURCES = [
  { entity: "product", fields: ["id", "thumbnail", "images.id", "images.url", "images.metadata", "metadata"] },
  { entity: "product_variant", fields: ["id", "thumbnail", "images.id", "images.url", "images.metadata", "metadata"] },
  { entity: "cart", fields: ["id", "metadata", "items.id", "items.thumbnail", "items.metadata"] },
  { entity: "order", fields: ["id", "metadata", "items.id", "items.thumbnail", "items.metadata", "items.line_item_metadata"] },
]

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function validKey(value: string): boolean {
  return Boolean(value && !value.startsWith("/") && !/[\\\x00-\x1f\x7f]/.test(value) &&
    value.split("/").every(segment => segment && segment !== "." && segment !== ".."))
}

/** Only the configured provider's exact origin and base path identify storage keys. */
export function storageKeyFromUrl(value: string, fileUrl: string): string | null {
  const base = new URL(fileUrl)
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("Invalid storage base URL")
  }
  const basePath = `${base.pathname.replace(/\/+$/, "")}/`
  const url = new URL(value)
  if (url.origin !== base.origin || url.username || url.password || !url.pathname.startsWith(basePath)) return null
  const segments = url.pathname.slice(basePath.length).split("/").map(segment => decodeURIComponent(segment))
  if (segments.some(segment => /[/\\]/.test(segment))) throw new Error("Ambiguous storage URL")
  const key = segments.join("/")
  if (!validKey(key)) throw new Error("Invalid storage key")
  return key
}

type PreviewInput = {
  query: { graph: (input: RemoteQueryInput<string>) => Promise<GraphResultSet<string>> }
  bucket: string
  fileUrl: string
  listObjects: (input: ListObjectsV2CommandInput) => Promise<ListObjectsV2Output>
  now?: Date
}

/**
 * Read-only observations, never authority to delete. Pagination/withDeleted follow
 * Medusa 2.21.2 types/modules-sdk/remote-query-object-from-string.d.ts. File IDs are
 * provider keys (file/dist/services/file-module-service.js), not database records.
 */
export async function previewAssetCleanup({ query, bucket, fileUrl, listObjects, now = new Date() }: PreviewInput) {
  const errors = new Set<string>()
  const usedKeys = new Set<string>()
  const photoFiles = new Map<string, string>()
  const photoIds = new Set<string>()
  const sourceCounts: Record<string, number> = {}
  const objects: { key: string; last_modified: string | null; size: number | null }[] = []

  const report = () => {
    const complete = errors.size === 0
    const cutoff = now.getTime() - ASSET_RETENTION_DAYS * 24 * 60 * 60 * 1000
    const candidates: typeof objects = []
    const retained: (typeof objects[number] & { reason: string })[] = []
    for (const object of objects) {
      const modified = object.last_modified ? Date.parse(object.last_modified) : NaN
      const privateMarker = object.key.split("/").some(segment => /^(private(?:-|$)|customer(?:-|$))/i.test(segment))
      const reason = !complete ? "assessment_incomplete"
        : usedKeys.has(object.key) ? "referenced"
        : !object.key.startsWith(PUBLIC_ASSET_PREFIX) || privateMarker ? "private_or_unclassified"
        : !IMAGE_EXTENSION.test(object.key) ? "not_an_image"
        : !Number.isFinite(modified) || modified > now.getTime() ? "unknown_or_invalid_age"
        : modified > cutoff ? "within_retention_period" : null
      if (reason) retained.push({ ...object, reason })
      else candidates.push(object)
    }
    return {
      mode: "read_only" as const,
      cleanup_available: false,
      deleted_count: 0,
      assessment_complete: complete,
      assessed_at: now.toISOString(),
      public_prefix: PUBLIC_ASSET_PREFIX,
      retention_days: ASSET_RETENTION_DAYS,
      namespace_write_isolation: "provider_pending",
      candidate_meaning: "Unreferenced images older than retention in the reserved prefix; not verified orphans or permission to delete.",
      outside_prefix_policy: "All legacy, private and unclassified objects are retained without listing them.",
      source_counts: sourceCounts,
      referenced_key_count: usedKeys.size,
      scanned_object_count: objects.length,
      candidates,
      retained,
      assessment_errors: [...errors],
      blockers: [
        ...errors,
        "Local uploads are split into separate public/private directories by access flag; an S3 provider with public/private namespace separation and verified object ACLs is not configured yet.",
        "Deletion requires versioned storage or recoverable quarantine, a restore procedure, and transactionally complete reference checks at apply time.",
      ],
    }
  }

  try {
    // Validate even when the database and reserved namespace are empty.
    storageKeyFromUrl(`${fileUrl.replace(/\/+$/, "")}/${PUBLIC_ASSET_PREFIX}validation.jpg`, fileUrl)
  } catch {
    errors.add("Storage base URL is invalid; references cannot be assessed.")
    return report()
  }

  function reference(value: unknown, field: string) {
    if (value == null || value === "") return
    if (typeof value !== "string") {
      errors.add(`Invalid reference value in ${field}.`)
      return
    }
    try {
      if (/^https?:\/\//i.test(value)) {
        const key = storageKeyFromUrl(value, fileUrl)
        if (key) usedKeys.add(key)
      } else if (validKey(value) && (FILE_FIELDS.has(field) || value.startsWith(PUBLIC_ASSET_PREFIX))) {
        usedKeys.add(value)
      } else {
        errors.add(`Unresolvable reference in ${field}.`)
      }
    } catch {
      errors.add(`Malformed storage reference in ${field}.`)
    }
  }

  function visit(value: unknown, field: string, depth = 0) {
    if (value == null) return
    if ((FILE_FIELDS.has(field) || URL_FIELDS.has(field) || field === "photo_id") && typeof value !== "string") {
      errors.add(`Invalid reference value in ${field}.`)
      return
    }
    if (depth > 32) {
      errors.add("Reference metadata exceeds the supported nesting depth.")
      return
    }
    if (typeof value === "string" && (ARRAY_FIELDS.has(field) || OBJECT_FIELDS.has(field))) {
      try { value = JSON.parse(value) } catch {
        errors.add(`Invalid JSON in ${field}.`)
        return
      }
    }
    // Legacy custom metadata may itself contain serialized reference objects.
    if (typeof value === "string" && /^[\[{]/.test(value.trim())) {
      try { visit(JSON.parse(value), "", depth + 1) } catch {
        errors.add("Invalid serialized reference metadata.")
      }
      return
    }
    if (ARRAY_FIELDS.has(field) && !Array.isArray(value)) {
      errors.add(`Invalid collection in ${field}.`)
      return
    }
    if (OBJECT_FIELDS.has(field) && !record(value)) {
      errors.add(`Invalid object in ${field}.`)
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (ARRAY_FIELDS.has(field) && !record(item) && typeof item !== "string") errors.add(`Invalid member in ${field}.`)
        visit(item, "", depth + 1)
      }
    } else if (record(value)) {
      if (typeof value.id === "string" && typeof value.file_id === "string") photoFiles.set(value.id, value.file_id)
      if (value.type === "image_full") {
        if (typeof value.content !== "string" || !value.content) errors.add("Invalid legacy detail image reference.")
        else reference(value.content, "url")
      }
      for (const [key, child] of Object.entries(value)) visit(child, key, depth + 1)
    } else if (typeof value === "string") {
      if (field === "photo_id") photoIds.add(value)
      else if (FILE_FIELDS.has(field) || URL_FIELDS.has(field) || /^https?:\/\//i.test(value) || value.startsWith(PUBLIC_ASSET_PREFIX)) reference(value, field)
    } else if (FILE_FIELDS.has(field) || URL_FIELDS.has(field) || field === "photo_id") {
      errors.add(`Invalid reference value in ${field}.`)
    }
  }

  for (const source of SOURCES) {
    const ids = new Set<string>()
    let expectedCount: number | undefined
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const skip = ids.size
        const result = await query.graph({
          entity: source.entity,
          fields: source.fields,
          withDeleted: true,
          pagination: { skip, take: PAGE_SIZE, order: { id: "ASC" } },
        })
        const count = result.metadata?.count
        if (!Array.isArray(result.data) || !Number.isSafeInteger(count) || count! < 0 ||
          result.metadata?.skip !== skip || result.metadata?.take !== PAGE_SIZE ||
          (expectedCount !== undefined && expectedCount !== count) || result.data.length > PAGE_SIZE) {
          throw new Error("Incomplete page")
        }
        expectedCount = count
        for (const row of result.data) {
          if (!record(row) || typeof row.id !== "string" || ids.has(row.id)) throw new Error("Invalid or duplicate row")
          // A missing selected field is not an empty reference collection.
          for (const field of source.fields.filter(field => !field.includes("."))) {
            if (!Object.prototype.hasOwnProperty.call(row, field)) throw new Error("Missing selected field")
          }
          const relation = source.entity === "product" || source.entity === "product_variant" ? "images" : "items"
          if (!Array.isArray(row[relation])) throw new Error("Missing selected relation")
          const childFields = source.fields.filter(field => field.startsWith(`${relation}.`)).map(field => field.split(".")[1])
          for (const child of row[relation] as unknown[]) {
            if (!record(child) || childFields.some(field => !Object.prototype.hasOwnProperty.call(child, field))) throw new Error("Incomplete selected relation")
          }
          ids.add(row.id)
          visit(row, "")
        }
        if (ids.size === count) break
        if (!result.data.length || ids.size > count! || page === MAX_PAGES - 1) throw new Error("Truncated page")
      }
    } catch {
      errors.add(`Incomplete ${source.entity} reference query; no objects can be considered candidates.`)
    }
    sourceCounts[source.entity] = ids.size
  }
  for (const id of photoIds) {
    if (!photoFiles.has(id)) errors.add("A photo reference has no corresponding file ID; reference coverage is incomplete.")
  }
  // Fail closed before storage access if any query/metadata could hide a reference.
  if (errors.size) return report()

  const tokens = new Set<string>()
  const keys = new Set<string>()
  let continuationToken: string | undefined
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await listObjects({
        Bucket: bucket,
        Prefix: PUBLIC_ASSET_PREFIX,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
      if ((result.Contents && !Array.isArray(result.Contents)) || typeof result.IsTruncated !== "boolean" ||
        (result.KeyCount !== undefined && result.KeyCount !== (result.Contents || []).length)) throw new Error("Incomplete object page")
      for (const object of result.Contents || []) {
        if (!object.Key || !validKey(object.Key) || !object.Key.startsWith(PUBLIC_ASSET_PREFIX) || keys.has(object.Key)) throw new Error("Invalid object key")
        keys.add(object.Key)
        objects.push({
          key: object.Key,
          last_modified: object.LastModified instanceof Date && Number.isFinite(object.LastModified.getTime()) ? object.LastModified.toISOString() : null,
          size: typeof object.Size === "number" && object.Size >= 0 ? object.Size : null,
        })
      }
      if (!result.IsTruncated) {
        if (result.NextContinuationToken) throw new Error("Inconsistent pagination")
        break
      }
      const next = result.NextContinuationToken
      if (!next || tokens.has(next) || page === MAX_PAGES - 1) throw new Error("Truncated object listing")
      tokens.add(next)
      continuationToken = next
    }
  } catch {
    errors.add("Incomplete public-prefix object listing; no objects can be considered candidates.")
  }
  return report()
}
