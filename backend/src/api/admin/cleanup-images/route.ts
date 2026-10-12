import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import { previewAssetCleanup } from "../../../lib/asset-cleanup-preview"

/** The former destructive POST is retired. This endpoint has no deletion mode. */
export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(410).json({
    mode: "read_only",
    cleanup_available: false,
    deleted_count: 0,
    message: "Image cleanup has been retired. Use GET for a read-only candidate report.",
  })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  // Match medusa-config.ts: a partial S3 configuration still uses local storage.
  const { S3_BUCKET, S3_FILE_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env
  if (!S3_BUCKET || !S3_FILE_URL || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    return res.status(503).json({
      mode: "read_only",
      cleanup_available: false,
      assessment_complete: false,
      deleted_count: 0,
      candidates: [],
      blockers: ["S3 storage is not configured; local and private uploads are preserved."],
    })
  }

  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  })
  try {
    const report = await previewAssetCleanup({
      query: req.scope.resolve(ContainerRegistrationKeys.QUERY),
      bucket: S3_BUCKET,
      fileUrl: S3_FILE_URL,
      listObjects: input => client.send(new ListObjectsV2Command(input)),
    })
    return res.status(report.assessment_complete ? 200 : 503).json(report)
  } catch {
    return res.status(503).json({
      mode: "read_only",
      cleanup_available: false,
      assessment_complete: false,
      deleted_count: 0,
      candidates: [],
      blockers: ["The candidate assessment is unavailable; all objects must be retained."],
    })
  } finally {
    client.destroy()
  }
}
