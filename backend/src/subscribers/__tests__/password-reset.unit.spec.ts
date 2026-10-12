import passwordResetHandler from "../password-reset"

function container(customer: unknown, customersList = true) {
  const createNotifications = jest.fn().mockResolvedValue([])
  const logger = { error: jest.fn(), warn: jest.fn() }
  const customers = {
    listCustomers: jest.fn(async () =>
      customersList ? ([customer] as unknown[]) : [],
    ),
  }
  const notifications = { createNotifications }
  const scope = {
    resolve: (key: string) => {
      if (key === "logger") return logger
      if (key === "customer") return customers
      if (key === "notification") return notifications
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

  it("surfaces a failed send instead of swallowing it", async () => {
    const { scope, logger, createNotifications } = container({ email: "owner@example.com", has_account: true })
    createNotifications.mockRejectedValue(new Error("resend down"))
    await passwordResetHandler({ ...event(), container: scope } as any)
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("owner@example.com"),
      expect.any(Error),
    )
  })
})
