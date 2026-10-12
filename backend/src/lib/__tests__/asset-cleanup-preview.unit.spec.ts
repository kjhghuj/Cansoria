import { previewAssetCleanup, PUBLIC_ASSET_PREFIX, storageKeyFromUrl } from "../asset-cleanup-preview"
import type { ListObjectsV2Output } from "@aws-sdk/client-s3"

const fileUrl = "https://storage.example.test/media"
const now = new Date("2026-10-10T00:00:00Z")
const old = new Date("2026-01-01T00:00:00Z")
const url = (name: string) => `${fileUrl}/${PUBLIC_ASSET_PREFIX}${name}`
const object = (name: string, LastModified: Date | undefined = old) => ({ Key: `${PUBLIC_ASSET_PREFIX}${name}`, LastModified, Size: 12 })
const product = (id: string, metadata: unknown = {}) => ({ id, thumbnail: null, images: [], metadata })

function setup(rows: Record<string, any[]> = {}, contents: ListObjectsV2Output["Contents"] = [object("unused.jpg")]) {
  const graph = jest.fn(async ({ entity, pagination }) => {
    const all = rows[entity] || []
    return { data: all.slice(pagination.skip, pagination.skip + pagination.take), metadata: { ...pagination, count: all.length } }
  })
  const listObjects = jest.fn().mockResolvedValue({ Contents: contents, IsTruncated: false })
  const deleteFiles = jest.fn()
  const run = () => previewAssetCleanup({ query: { graph }, bucket: "mock-bucket", fileUrl, listObjects, now })
  return { graph, listObjects, deleteFiles, run }
}

describe("read-only asset candidate assessment", () => {
  it("protects product, variant, story/legacy sections, customer and line metadata references", async () => {
    const names = ["thumb.jpg", "product.jpg", "image-meta.jpg", "variant-thumb.jpg", "variant.jpg", "variant-meta.jpg", "story.jpg", "story-json.jpg", "detail.jpg", "cart.jpg", "cart-line.jpg", "order.jpg", "order-line.jpg", "line-legacy.jpg", "reference-only.jpg", "serialized.jpg"]
    const p = product("prod_1", {
      story_sections: [{ imageUrl: url("story.jpg") }],
      detail_sections: JSON.stringify([{ type: "image_full", content: url("detail.jpg") }]),
    }) as any
    p.thumbnail = url("thumb.jpg")
    p.images = [{ id: "img_1", url: url("product.jpg"), metadata: { file_id: `${PUBLIC_ASSET_PREFIX}image-meta.jpg` } }]
    const v = product("variant_1", { images: [{ url: url("variant-meta.jpg") }] }) as any
    v.thumbnail = url("variant-thumb.jpg")
    v.images = [{ id: "img_2", url: url("variant.jpg"), metadata: null }]
    const { run, listObjects, deleteFiles } = setup({
      product: [p, product("prod_2", { story_sections: JSON.stringify([{ imageUrl: url("story-json.jpg") }]) })],
      product_variant: [v],
      cart: [{ id: "cart_1", metadata: { photo: { file_id: `${PUBLIC_ASSET_PREFIX}cart.jpg` }, portrait_photos: [{ id: "photo_1", file_id: `${PUBLIC_ASSET_PREFIX}reference-only.jpg` }], custom: JSON.stringify({ file_id: `${PUBLIC_ASSET_PREFIX}serialized.jpg` }) }, items: [{ id: "cali_1", thumbnail: null, metadata: { photo: { file_id: `${PUBLIC_ASSET_PREFIX}cart-line.jpg` }, portrait: { photo_id: "photo_1" } } }] }],
      order: [{ id: "order_1", metadata: { photo: { file_id: `${PUBLIC_ASSET_PREFIX}order.jpg` } }, items: [{ id: "ordli_1", thumbnail: null, metadata: { file_id: `${PUBLIC_ASSET_PREFIX}order-line.jpg` }, line_item_metadata: { file_id: `${PUBLIC_ASSET_PREFIX}line-legacy.jpg` } }] }],
    }, [...names.map(name => object(name)), object("unused.jpg")])
    const report = await run()
    expect(report.assessment_complete).toBe(true)
    expect(report.candidates.map(item => item.key)).toEqual([`${PUBLIC_ASSET_PREFIX}unused.jpg`])
    expect(report.retained.every(item => item.reason === "referenced")).toBe(true)
    expect(listObjects).toHaveBeenCalledWith(expect.objectContaining({ Prefix: PUBLIC_ASSET_PREFIX }))
    expect(report).toMatchObject({ mode: "read_only", cleanup_available: false, deleted_count: 0, namespace_write_isolation: "provider_pending" })
    expect(deleteFiles).not.toHaveBeenCalled()
  })

  it("validates exact storage origin and base path, including encoded filenames", () => {
    expect(storageKeyFromUrl(`${fileUrl}/public-assets/hello%20cat.jpg?signature=x`, fileUrl)).toBe("public-assets/hello cat.jpg")
    for (const external of ["https://external.test/media/public-assets/a.jpg", "https://storage.example.test/media-other/public-assets/a.jpg", "https://storage.example.test/public-assets/a.jpg", "https://storage.example.test:8443/media/public-assets/a.jpg"]) {
      expect(storageKeyFromUrl(external, fileUrl)).toBeNull()
    }
    expect(() => storageKeyFromUrl(`${fileUrl}/public-assets/a%2Ffile.jpg`, fileUrl)).toThrow()
    expect(() => storageKeyFromUrl(`${fileUrl}/public-assets/%zz.jpg`, fileUrl)).toThrow()
  })

  it("does not mistake external URLs for stored references", async () => {
    const { run } = setup({ product: [product("prod_1", { story_sections: [{ imageUrl: "https://external.test/media/public-assets/unused.jpg" }] })] })
    const report = await run()
    expect(report.assessment_complete).toBe(true)
    expect(report.referenced_key_count).toBe(0)
    expect(report.candidates).toHaveLength(1)
  })

  it("never lists legacy or private namespaces, including the original customer/story regression", async () => {
    const { run, listObjects } = setup({
      product: [product("prod_1", { story_sections: [{ imageUrl: `${fileUrl}/story-only.jpg` }] })],
      cart: [{ id: "cart_1", metadata: { portrait_photos: [{ id: "photo_1", file_id: "private/reference.jpg" }] }, items: [] }],
      order: [{ id: "order_1", metadata: { file_id: "private/order-reference.jpg" }, items: [] }],
    })
    const bucketObjects = [{ Key: "private/reference.jpg", LastModified: old }, { Key: "private/order-reference.jpg", LastModified: old }, { Key: "story-only.jpg", LastModified: old }, { Key: "unclassified.jpg", LastModified: old }, object("unused.jpg")]
    listObjects.mockImplementation(async input => ({ Contents: bucketObjects.filter(item => item.Key.startsWith(input.Prefix)), IsTruncated: false }))
    const report = await run()
    expect(report.assessment_complete).toBe(true)
    expect(report.referenced_key_count).toBe(3)
    expect(report.scanned_object_count).toBe(1)
    expect(listObjects.mock.calls.every(([input]) => input.Prefix === PUBLIC_ASSET_PREFIX)).toBe(true)
    expect(report.outside_prefix_policy).toContain("retained without listing")
    expect(report.deleted_count).toBe(0)
  })

  it("paginates all reference sources and object pages without any storage mutation", async () => {
    const rows = Array.from({ length: 251 }, (_, i) => product(`prod_${String(i).padStart(3, "0")}`, i === 250 ? { story_sections: [{ imageUrl: url("late.jpg") }] } : {}))
    const { run, graph, listObjects, deleteFiles } = setup({ product: rows })
    listObjects.mockResolvedValueOnce({ Contents: [object("unused.jpg")], IsTruncated: true, NextContinuationToken: "next" })
      .mockResolvedValueOnce({ Contents: [object("late.jpg")], IsTruncated: false })
    const report = await run()
    expect(report.assessment_complete).toBe(true)
    expect(report.source_counts.product).toBe(251)
    expect(graph).toHaveBeenCalledWith(expect.objectContaining({ entity: "product", withDeleted: true, pagination: { skip: 250, take: 250, order: { id: "ASC" } } }))
    expect(listObjects.mock.calls[1][0]).toMatchObject({ Prefix: PUBLIC_ASSET_PREFIX, ContinuationToken: "next" })
    expect(report.candidates.map(item => item.key)).toEqual([`${PUBLIC_ASSET_PREFIX}unused.jpg`])
    expect(deleteFiles).not.toHaveBeenCalled()
  })

  it("retains private markers, recent/unknown dates and non-image files", async () => {
    const { run } = setup({}, [object("private/reference.jpg"), object("private-customer.jpg"), object("customer/photos.jpg"), object("new.jpg", new Date("2026-10-09T00:00:00Z")), object("future.jpg", new Date("2027-01-01T00:00:00Z")), object("notes.txt")])
    const { run: missingDate } = setup({}, [{ Key: `${PUBLIC_ASSET_PREFIX}missing.jpg`, LastModified: undefined, Size: 12 }])
    expect((await run()).candidates).toEqual([])
    expect((await missingDate()).candidates).toEqual([])
  })

  it.each([
    ["invalid story JSON", { story_sections: "[invalid" }],
    ["invalid detail shape", { detail_sections: {} }],
    ["invalid story URL", { story_sections: [{ imageUrl: 123 }] }],
    ["invalid story URL object", { story_sections: [{ imageUrl: { value: false } }] }],
    ["invalid file ID object", { photo: { file_id: { value: false } } }],
    ["invalid file ID", { photo: { file_id: "../private.jpg" } }],
    ["unresolved photo ID", { portrait: { photo_id: "missing-photo" } }],
    ["invalid arbitrary serialized metadata", { custom: '{"file_id":' }],
  ])("fails closed for %s", async (_label, metadata) => {
    const { run, listObjects } = setup({ product: [product("prod_1", metadata)] })
    const report = await run()
    expect(report.assessment_complete).toBe(false)
    expect(report.candidates).toEqual([])
    expect(report.assessment_errors.length).toBeGreaterThan(0)
    expect(listObjects).not.toHaveBeenCalled()
  })

  it.each(["missing-count", "missing-field", "query-error", "truncated", "duplicate", "changed-count"])("fails closed for %s reference pages", async failure => {
    const { run, graph, listObjects } = setup()
    const p = product("prod_1")
    if (failure === "query-error") graph.mockRejectedValueOnce(new Error("query unavailable"))
    else if (failure === "missing-count") graph.mockResolvedValueOnce({ data: [], metadata: undefined } as any)
    else if (failure === "missing-field") graph.mockResolvedValueOnce({ data: [{ id: "prod_1", metadata: {} }], metadata: { skip: 0, take: 250, count: 1 } } as any)
    else {
      graph.mockResolvedValueOnce({ data: [p], metadata: { skip: 0, take: 250, count: 2 } } as any)
      graph.mockResolvedValueOnce({ data: failure === "duplicate" ? [p] : [], metadata: { skip: 1, take: 250, count: failure === "changed-count" ? 3 : 2 } } as any)
    }
    const report = await run()
    expect(report.assessment_complete).toBe(false)
    expect(report.candidates).toEqual([])
    expect(listObjects).not.toHaveBeenCalled()
  })

  it.each(["missing-token", "repeated-token", "missing-truncation", "listing-error", "unexpected-legacy", "key-count-mismatch"])("retains every observed object when listing has %s", async failure => {
    const { run, listObjects, deleteFiles } = setup()
    if (failure === "listing-error") listObjects.mockRejectedValueOnce(new Error("mock S3 failure"))
    else if (failure === "unexpected-legacy") listObjects.mockResolvedValueOnce({ Contents: [object("unused.jpg"), { Key: "legacy.jpg", LastModified: old }], IsTruncated: false })
    else if (failure === "missing-truncation") listObjects.mockResolvedValueOnce({ Contents: [object("unused.jpg")] })
    else if (failure === "key-count-mismatch") listObjects.mockResolvedValueOnce({ Contents: [object("unused.jpg")], KeyCount: 2, IsTruncated: false })
    else {
      listObjects.mockResolvedValueOnce({ Contents: [object("unused.jpg")], IsTruncated: true, NextContinuationToken: failure === "missing-token" ? undefined : "repeat" })
      if (failure === "repeated-token") listObjects.mockResolvedValueOnce({ Contents: [], IsTruncated: true, NextContinuationToken: "repeat" })
    }
    const report = await run()
    expect(report.assessment_complete).toBe(false)
    expect(report.candidates).toEqual([])
    expect(report.retained.every(item => item.reason === "assessment_incomplete")).toBe(true)
    expect(deleteFiles).not.toHaveBeenCalled()
    expect(listObjects.mock.calls.every(([input]) => input.Prefix === PUBLIC_ASSET_PREFIX)).toBe(true)
  })

  it("validates the storage base before querying or listing", async () => {
    const { graph, listObjects } = setup()
    const report = await previewAssetCleanup({ query: { graph }, bucket: "mock", fileUrl: "https://storage.test/media?wrong=base", listObjects, now })
    expect(report.assessment_complete).toBe(false)
    expect(report.candidates).toEqual([])
    expect(graph).not.toHaveBeenCalled()
    expect(listObjects).not.toHaveBeenCalled()
  })
})
