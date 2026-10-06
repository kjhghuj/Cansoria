import axios from "axios"
import { verifyTurnstileToken } from "../turnstile"
jest.mock("axios", () => ({ post: jest.fn() }))
describe("Turnstile server proof", () => {
  const saved = { secret: process.env.TURNSTILE_SECRET_KEY, hosts: process.env.TURNSTILE_HOSTNAMES, action: process.env.TURNSTILE_ACTION, env: process.env.NODE_ENV }
  beforeEach(() => { process.env.TURNSTILE_SECRET_KEY = "test"; process.env.TURNSTILE_HOSTNAMES = "cansoria.test"; process.env.TURNSTILE_ACTION = "newsletter"; jest.clearAllMocks() })
  afterAll(() => { for (const [key, value] of Object.entries({ TURNSTILE_SECRET_KEY: saved.secret, TURNSTILE_HOSTNAMES: saved.hosts, TURNSTILE_ACTION: saved.action, NODE_ENV: saved.env })) if (value === undefined) delete process.env[key]; else process.env[key] = value })
  it.each([{ success: false }, { success: true, hostname: "evil.test", action: "newsletter" }, { success: true, hostname: "cansoria.test", action: "login" }, { success: true, action: "newsletter" }])("rejects invalid challenge response %p", async data => {
    ;(axios.post as jest.Mock).mockResolvedValue({ data })
    expect(await verifyTurnstileToken("proof")).toBe(false)
  })
  it("requires the configured hostname and action", async () => {
    ;(axios.post as jest.Mock).mockResolvedValue({ data: { success: true, hostname: "cansoria.test", action: "newsletter" } })
    expect(await verifyTurnstileToken("proof")).toBe(true)
  })
  it("fails closed without a secret, with invalid token or when verification fails", async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    expect(await verifyTurnstileToken("proof")).toBe(false)
    process.env.TURNSTILE_SECRET_KEY = "test"
    expect(await verifyTurnstileToken(null as any)).toBe(false)
    ;(axios.post as jest.Mock).mockRejectedValueOnce(Error("network"))
    expect(await verifyTurnstileToken("proof")).toBe(false)
  })
  it("requires a hostname allowlist in production", async () => {
    process.env.NODE_ENV = "production"; delete process.env.TURNSTILE_HOSTNAMES
    ;(axios.post as jest.Mock).mockResolvedValue({ data: { success: true, hostname: "cansoria.test", action: "newsletter" } })
    expect(await verifyTurnstileToken("proof")).toBe(false)
    process.env.NODE_ENV = saved.env
  })
})
