import { POST } from "../store/newsletter/route";
const subscribe = jest.fn(async (..._args: unknown[]) => {});
jest.mock("../../lib/klaviyo", () => ({
  subscribeToNewsletter: (...args) => subscribe(...args),
}));
jest.mock("../../lib/turnstile", () => ({
  verifyTurnstileToken: jest.fn(async () => true),
}));
function setup() {
  const customer = {
    id: "cus_a",
    email: "owner@example.com",
    has_account: true,
    created_at: new Date(Date.now() - 86400000),
    metadata: {
      welcome_discount_code: "ART15-SAFE",
      welcome_discount_valid_until: "2099-01-01",
    },
  };
  const promotion = {
    code: "ART15-SAFE",
    status: "active",
    rules: [
      {
        attribute: "customer.id",
        operator: "eq",
        values: [{ value: "cus_a" }],
      },
      {
        attribute: "email",
        operator: "eq",
        values: [{ value: "owner@example.com" }],
      },
    ],
    campaign: { budget: { type: "usage", limit: 1, used: 0 }, ends_at: null },
  };
  const req = {
    auth_context: { actor_id: "cus_a" },
    body: { email: "owner@example.com", turnstile_token: "mock-valid" },
    scope: {
      resolve: (key) =>
        ({
          customer: { retrieveCustomer: async () => customer },
          promotion: { listPromotions: async () => [promotion] },
        })[key],
    },
  } as any;
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;
  return { req, res, customer, promotion };
}
describe("newsletter welcome eligibility follows immutable account age", () => {
  beforeEach(() => jest.clearAllMocks());
  it("returns the canonical 30-day expiry instead of mutable customer metadata", async () => {
    const h = setup();
    await POST(h.req, h.res);
    expect(h.res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_code: "ART15-SAFE",
        valid_until: new Date(
          h.customer.created_at.getTime() + 30 * 86400000,
        ).toISOString(),
      }),
    );
    expect(subscribe).toHaveBeenCalledTimes(1);
  });
  it.each(["expired", "guest", "legacy-campaign", "used"])(
    "does not advertise unsafe %s coupons",
    async (kind) => {
      const h = setup();
      if (kind === "expired")
        h.customer.created_at = new Date(Date.now() - 31 * 86400000);
      if (kind === "guest") h.customer.has_account = false;
      if (kind === "legacy-campaign")
        h.promotion.campaign.ends_at = new Date(Date.now() + 86400000) as any;
      if (kind === "used") h.promotion.campaign.budget.used = 1;
      await POST(h.req, h.res);
      expect(h.res.json.mock.calls[0][0]).not.toHaveProperty("discount_code");
    },
  );
});
