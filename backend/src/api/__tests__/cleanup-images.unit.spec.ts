const send = jest.fn()
const destroy = jest.fn()
const createClient = jest.fn()
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation((...args) => { createClient(...args); return { send, destroy } }),
  ListObjectsV2Command: class { constructor(public input: unknown) {} },
  DeleteObjectCommand: jest.fn(() => { throw new Error("Deletion must never be constructed") }),
  DeleteObjectsCommand: jest.fn(() => { throw new Error("Deletion must never be constructed") }),
}))
import { GET, POST } from "../admin/cleanup-images/route"
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3"

const keys = ["S3_BUCKET", "S3_FILE_URL", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const
const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]))
function setup() {
  const graph = jest.fn(async ({ pagination }) => ({ data: [], metadata: { ...pagination, count: 0 } }))
  const providerDelete = jest.fn()
  const req = { query: {}, body: {}, scope: { resolve: jest.fn(key => key === "query" ? { graph } : { deleteFiles: providerDelete }) } } as any
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
  return { req, res, graph, providerDelete }
}

describe("retired cleanup mutation and read-only admin preview", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of keys) process.env[key] = key === "S3_FILE_URL" ? "https://mock-storage.test/media" : "mock-only"
    send.mockResolvedValue({ Contents: [], IsTruncated: false })
  })
  afterAll(() => {
    for (const key of keys) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
  })
  afterEach(() => {
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
    expect(DeleteObjectsCommand).not.toHaveBeenCalled()
  })

  it.each([{}, { apply: true }, { dryRun: false }, { mode: "delete" }, { keys: ["private/ref.jpg"] }])("rejects legacy POST without accessing query/storage: %j", async body => {
    const { req, res, providerDelete } = setup()
    req.body = body
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(410)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ cleanup_available: false, deleted_count: 0 }))
    expect(req.scope.resolve).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
    expect(providerDelete).not.toHaveBeenCalled()
  })

  it("lists only the fixed prefix even if GET query requests deletion or an alternate prefix", async () => {
    const { req, res, graph, providerDelete } = setup()
    req.query = { apply: "true", prefix: "", mode: "delete" }
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(graph).toHaveBeenCalledTimes(4)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0].input).toMatchObject({ Prefix: "public-assets/" })
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mode: "read_only", cleanup_available: false, namespace_write_isolation: "provider_pending", deleted_count: 0 }))
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(providerDelete).not.toHaveBeenCalled()
  })

  it("does not list anything for the current local or partial S3 provider configuration", async () => {
    const { req, res } = setup()
    delete process.env.S3_SECRET_ACCESS_KEY
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ assessment_complete: false, candidates: [], deleted_count: 0 }))
    expect(req.scope.resolve).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it("returns an incomplete report when reference queries fail and performs no S3 requests", async () => {
    const { req, res, graph } = setup()
    graph.mockRejectedValueOnce(new Error("mock database error"))
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ assessment_complete: false, candidates: [], deleted_count: 0 }))
    expect(send).not.toHaveBeenCalled()
  })

  it("fails closed when the query service itself cannot be resolved", async () => {
    const { req, res } = setup()
    req.scope.resolve.mockImplementation(() => { throw new Error("mock container unavailable") })
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ assessment_complete: false, candidates: [], deleted_count: 0 }))
    expect(send).not.toHaveBeenCalled()
    expect(destroy).toHaveBeenCalledTimes(1)
  })
})
