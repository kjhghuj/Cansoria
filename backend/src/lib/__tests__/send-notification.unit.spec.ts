import { sendNotification, resendNotification, STALE_PENDING_MS, NotificationRetryError } from "../send-notification"
import { verifyAccessToken } from "../access-tokens"

type NotificationRow = { id: string; status: string; created_at: string | Date; to?: string; channel?: string; template?: string; data?: unknown; idempotency_key?: string | null }

const delivered = { id: "noti_new", status: "success" }

function container(records: NotificationRow[] = []) {
  const createNotifications = jest.fn().mockResolvedValue(delivered)
  const updateNotifications = jest.fn().mockResolvedValue([])
  const listNotifications = jest.fn(async (filters: Record<string, unknown>) => {
    const recordFilter = (record: NotificationRow) => {
      if (filters.id) return record.id === filters.id
      const key = filters.idempotency_key
      if (typeof key === "string") return record.idempotency_key === key
      if (key && typeof key === "object" && typeof (key as Record<string, unknown>).$like === "string") {
        const like = (key as Record<string, unknown>).$like as string
        const pattern = `^${like.split("%").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`
        return typeof record.idempotency_key === "string" && new RegExp(pattern).test(record.idempotency_key)
      }
      return true
    }
    return records.filter(recordFilter)
  })
  const retrieveNotification = jest.fn(async (id: string) => {
    const found = records.find((r) => r.id === id)
    if (!found) throw new Error("not found")
    return found
  })
  const execute = jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn())
  return {
    createNotifications,
    updateNotifications,
    listNotifications,
    retrieveNotification,
    execute,
    scope: { resolve: (key: string) => (key === "locking" ? { execute } : { createNotifications, updateNotifications, listNotifications, retrieveNotification }) } as any,
  }
}

const payload = { to: "owner@example.com", channel: "email", template: "order_placed", idempotency_key: "order:order_a:placed", data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=first" } }

describe("durable notification sending", () => {
  it("creates a fresh record when no prior attempt exists", async () => {
    const c = container()
    await sendNotification(c.scope, payload)
    expect(c.createNotifications).toHaveBeenCalledWith(payload)
    expect(c.updateNotifications).not.toHaveBeenCalled()
  })
  it("serializes keyed sends behind a per-key lock", async () => {
    const c = container()
    await sendNotification(c.scope, payload)
    expect(c.execute).toHaveBeenCalledWith(`notification:${payload.idempotency_key}`, expect.any(Function), expect.any(Object))
  })
  it("dedupes an already successful send", async () => {
    const c = container([{ id: "noti_ok", status: "success", created_at: new Date(), idempotency_key: payload.idempotency_key }])
    await sendNotification(c.scope, payload)
    expect(c.createNotifications).not.toHaveBeenCalled()
  })
  it("frees the idempotency key of a failed attempt and retries cleanly with the first attempt's content", async () => {
    const c = container([{ id: "noti_fail", status: "failure", created_at: new Date(), data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=first" }, idempotency_key: payload.idempotency_key }])
    await sendNotification(c.scope, { ...payload, data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=regenerated" } })
    expect(c.updateNotifications).toHaveBeenCalledWith([{ id: "noti_fail", idempotency_key: `${payload.idempotency_key}:attempt:noti_fail` }])
    // Same key must carry the same content: the pinned first-attempt data wins.
    expect(c.createNotifications).toHaveBeenCalledWith(expect.objectContaining({ data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=first" } }))
  })
  it("treats an abandoned stale pending attempt as retryable", async () => {
    const c = container([{ id: "noti_stale", status: "pending", created_at: new Date(Date.now() - STALE_PENDING_MS - 1), idempotency_key: payload.idempotency_key }])
    await sendNotification(c.scope, payload)
    expect(c.updateNotifications).toHaveBeenCalled()
    expect(c.createNotifications).toHaveBeenCalled()
  })
  it("asks for a later retry while a fresh attempt is still pending", async () => {
    const c = container([{ id: "noti_fresh", status: "pending", created_at: new Date(), idempotency_key: payload.idempotency_key }])
    await expect(sendNotification(c.scope, payload)).rejects.toBeInstanceOf(NotificationRetryError)
    expect(c.createNotifications).not.toHaveBeenCalled()
  })
  it("treats an unanswered framework send (skipped by a concurrent pending) as retryable, never delivered", async () => {
    const c = container()
    c.createNotifications.mockResolvedValue(undefined)
    await expect(sendNotification(c.scope, payload)).rejects.toBeInstanceOf(NotificationRetryError)
  })
  it("requires the framework to confirm success before a record counts as delivered", async () => {
    const c = container()
    c.createNotifications.mockResolvedValue({ id: "noti_unverified", status: "pending" })
    await expect(sendNotification(c.scope, payload)).rejects.toBeInstanceOf(NotificationRetryError)
  })
  it("propagates provider failures so the worker requeues", async () => {
    const c = container()
    c.createNotifications.mockRejectedValue(new Error("resend down"))
    await expect(sendNotification(c.scope, payload)).rejects.toThrow("resend down")
  })
  it("sends unkeyed payloads straight through, still verified", async () => {
    const c = container([{ id: "noti_other", status: "pending", created_at: new Date() }])
    await sendNotification(c.scope, { ...payload, idempotency_key: undefined })
    expect(c.createNotifications).toHaveBeenCalledTimes(1)
  })
  it("fails closed when the notification lock backend is unavailable", async () => {
    const c = container()
    c.execute.mockRejectedValue(new Error("lock down"))
    await expect(sendNotification(c.scope, payload)).rejects.toThrow("lock down")
  })
  it("recovers the original payload when a retry crashed between the rename and the create", async () => {
    // The rename freed the key; the create never ran. Only the renamed
    // attempt record still exists, holding the content the provider saw.
    const originalData = { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=first" }
    const c = container([{ id: "noti_fail", status: "failure", created_at: new Date(Date.now() - 60_000), data: originalData, idempotency_key: `${payload.idempotency_key}:attempt:noti_fail` }])
    await sendNotification(c.scope, { ...payload, data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=regenerated" } })
    expect(c.createNotifications).toHaveBeenCalledWith(expect.objectContaining({
      idempotency_key: payload.idempotency_key,
      data: originalData,
    }))
  })
  it("keeps the oldest attempt's content when several renamed attempts exist", async () => {
    const oldestData = { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=first" }
    const c = container([
      { id: "noti_newer", status: "failure", created_at: new Date(Date.now() - 30_000), data: { id: "order_a", access_url: "other" }, idempotency_key: `${payload.idempotency_key}:attempt:noti_newer` },
      { id: "noti_oldest", status: "failure", created_at: new Date(Date.now() - 90_000), data: oldestData, idempotency_key: `${payload.idempotency_key}:attempt:noti_oldest` },
    ])
    await sendNotification(c.scope, payload)
    expect(c.createNotifications).toHaveBeenCalledWith(expect.objectContaining({ data: oldestData }))
  })
  it("falls back to a genuine first send when the recovery query cannot run", async () => {
    const c = container([])
    c.listNotifications.mockImplementation(async (filters: Record<string, unknown>) => {
      if (typeof filters.idempotency_key === "string") return []
      throw new Error("like unsupported")
    })
    await sendNotification(c.scope, payload)
    expect(c.createNotifications).toHaveBeenCalledWith(payload)
  })
})

describe("template-aware operations resend", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters"
    process.env.STOREFRONT_URL = "https://cansoria.test"
  })
  it("refuses to resend a password reset link: its token may be spent or expired", async () => {
    const c = container([{ id: "noti_reset", status: "failure", created_at: new Date(), to: "owner@example.com", channel: "email", template: "password_reset", data: { reset_url: "https://cansoria.test/account/reset-password?token=expired" }, idempotency_key: "password-reset:abc" }])
    const result = await resendNotification(c.scope, "noti_reset")
    expect(result).toMatchObject({ sent: false, reason: "stale_link" })
    expect(c.createNotifications).not.toHaveBeenCalled()
  })
  it("mints a fresh signed link for an order confirmation resend", async () => {
    const c = container([{ id: "noti_order", status: "failure", created_at: new Date(), to: "owner@example.com", channel: "email", template: "order_placed", data: { id: "order_a", access_url: "https://cansoria.test/order/lookup?order=order_a&token=expired" }, idempotency_key: "order:order_a:placed" }])
    const result = await resendNotification(c.scope, "noti_order")
    expect(result.sent).toBe(true)
    const created = c.createNotifications.mock.calls[0][0]
    expect(created.idempotency_key).toMatch(/^order:order_a:placed:resend:\d+$/)
    const url = new URL(String(created.data.access_url))
    expect(url.pathname).toBe("/order/lookup")
    expect(url.searchParams.get("order")).toBe("order_a")
    expect(verifyAccessToken(url.searchParams.get("token"), "order-claim", "order_a")).toBe(true)
  })
  it("re-signs an order access resend from the stored order id", async () => {
    const c = container([{ id: "noti_access", status: "failure", created_at: new Date(), to: "owner@example.com", channel: "email", template: "order_access", data: { order_id: "order_b", access_url: "https://cansoria.test/order/lookup?order=order_b&token=expired" }, idempotency_key: "order-access:1" }])
    const result = await resendNotification(c.scope, "noti_access")
    expect(result.sent).toBe(true)
    const url = new URL(String(c.createNotifications.mock.calls[0][0].data.access_url))
    expect(url.searchParams.get("order")).toBe("order_b")
    expect(verifyAccessToken(url.searchParams.get("token"), "order-claim", "order_b")).toBe(true)
  })
  it("keeps credential-free templates resendable as stored", async () => {
    const c = container([{ id: "noti_welcome", status: "failure", created_at: new Date(), to: "owner@example.com", channel: "email", template: "customer_created", data: { first_name: "Owner" }, idempotency_key: "welcome:cus_a" }])
    const result = await resendNotification(c.scope, "noti_welcome")
    expect(result.sent).toBe(true)
    expect(c.createNotifications.mock.calls[0][0].data).toEqual({ first_name: "Owner" })
  })
  it("reports an unknown notification id", async () => {
    const c = container([])
    expect(await resendNotification(c.scope, "noti_missing")).toMatchObject({ sent: false, reason: "not_found" })
  })
})
