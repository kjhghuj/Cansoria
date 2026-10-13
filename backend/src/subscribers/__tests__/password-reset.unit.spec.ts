import passwordResetHandler from "../password-reset"

function container(customer: unknown, customersList = true) {
  const createNotifications = jest.fn().mockResolvedValue({ id: "noti_sent", status: "success" })
  const logger = { error: jest.fn(), warn: jest.fn() }
  const customers = {
    listCustomers: jest.fn(async () =>
      customersList ? ([customer] as unknown[]) : [],
    ),
  }
  const notifications = { createNotifications, listNotifications: jest.fn().mockResolvedValue([]) }
  const locking = { execute: jest.fn(async (_key: string, fn: () => Promise<unknown>) => fn()) }
  const scope = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === "customer") return customers
      if (key === "notification") return notifications
      if (key === "locking") return locking
      throw new Error(`unexpected module ${key}`)
    },
  }
  return { scope, notifications, createNotifications, logger }
}

const event = (overrides: Record<string, unknown> = {}) =>
  ({
    event: {
      data: {
        entity_id: "owner@example.com",
        actor_type: "customer",
        token: "reset.jwt.token",
        metadata: {},
        ...overrides,
      },
    },
    container: null as any,
  }) as any

describe("password reset notification", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters"
    process.env.STOREFRONT_URL = "https://cansoria.example"
  })

  it("sends a single-use reset link only to registered customers", async () => {
    const { scope, createNotifications } = container({ email: "owner@example.com", has_account: true })
    await passwordResetHandler({ ...event(), container: scope } as any)
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        channel: "email",
        template: "password_reset",
        data: {
          reset_url: expect.stringMatching(
            /^https:\/\/cansoria\.example\/account\/reset-password\?token=reset\.jwt\.token$/,
          ),
        },
      }),
    )
    const key = createNotifications.mock.calls[0][0].idempotency_key
    expect(key).toMatch(/^password-reset:[0-9a-f]{32}$/)
  })

  it.each([
    ["guest checkout identity", { email: "owner@example.com", has_account: false }],
  ])("never emails a %s", async (_label, customer) => {
    const { scope, createNotifications } = container(customer)
    await passwordResetHandler({ ...event(), container: scope } as any)
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("ignores unknown emails without revealing anything", async () => {
    const { scope, createNotifications } = container(null, false)
    await passwordResetHandler({ ...event(), container: scope } as any)
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("ignores non-customer reset events", async () => {
    const { scope, createNotifications } = container({ email: "owner@example.com", has_account: true })
    await passwordResetHandler({
      ...event({ actor_type: "user" }),
      container: scope,
    } as any)
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("propagates a failed send so the event worker retries it", async () => {
    const { scope, createNotifications } = container({ email: "owner@example.com", has_account: true })
    createNotifications.mockRejectedValue(new Error("resend down"))
    await expect(passwordResetHandler({ ...event(), container: scope } as any)).rejects.toThrow("resend down")
  })
  it("retries later while a fresh send is still pending", async () => {
    const { scope, notifications, createNotifications } = container({ email: "owner@example.com", has_account: true })
    notifications.listNotifications.mockResolvedValue([{ id: "noti_fresh", status: "pending", created_at: new Date().toISOString() }])
    await expect(passwordResetHandler({ ...event(), container: scope } as any)).rejects.toThrow(/pending/)
    expect(createNotifications).not.toHaveBeenCalled()
  })
})
