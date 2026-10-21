import {
  validateCheckoutCompletion,
  CheckoutCompletionError,
} from "../checkout-completion";

function fixture() {
  // Installed completeCartFields does not include nested product.handle or promotions.code.
  const cart = {
    id: "cart_a",
    email: "OWNER@example.com",
    items: [
      {
        product_id: "prod_a",
        product_handle: "meridian-automatic",
        variant: { product: { id: "prod_a" } },
        metadata: {
          engraving: {
            text: "For Dad, 2026",
            font: "serif",
            source_cart_id: "cart_a",
          },
        },
        adjustments: [],
      },
    ],
    shipping_methods: [],
    promotions: [],
    customer: {
      id: "cus_a",
      has_account: true,
      created_at: new Date().toISOString(),
      email: " owner@example.com ",
    },
    payment_collection: {
      payment_sessions: [{ provider_id: "pp_stripe_stripe" }],
    },
  } as any;
  const promotion = {
    id: "promo_a",
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
    campaign: {
      starts_at: null,
      ends_at: null,
      budget: { type: "usage", limit: 1, used: 0 },
    },
  };
  const graph = jest.fn(async ({ entity }) => ({
    data:
      entity === "order_cart"
        ? []
        : entity === "product"
          ? [{ id: "prod_a", handle: "meridian-automatic", metadata: { engraveable: true } }]
          : (() => {
              throw new Error("Never replace the native cart snapshot");
            })(),
  }));
  const promotions = { listPromotions: jest.fn(async () => [promotion]) };
  const stores = {
    listStores: jest.fn(async () => [{ metadata: { orders_open: true } }]),
  };
  const container = {
    resolve: (key) =>
      ({
        query: { graph },
        promotion: promotions,
        store: stores,
      })[key],
  } as any;
  return {
    cart,
    promotion,
    graph,
    promotions,
    stores,
    container,
    run: () => validateCheckoutCompletion({ id: "cart_a" }, cart, container),
  };
}
function freeze(value: any): any {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function welcome(f: ReturnType<typeof fixture>) {
  f.cart.promotions = [{ id: "promo_a" }];
  f.cart.items[0].adjustments = [
    { promotion_id: "promo_a", code: "ART15-SAFE" },
  ];
}
describe("native checkout snapshot policy", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  afterEach(() => jest.useRealTimers());
  it("validates an immutable native shape without a replacement cart read", async () => {
    const f = fixture();
    welcome(f);
    freeze(f.cart);
    await f.run();
    expect(f.graph.mock.calls.map(([v]) => v.entity)).toEqual([
      "order_cart",
      "product",
    ]);
  });
  it("resolves engraving identity when product_handle is absent", async () => {
    const f = fixture();
    delete f.cart.items[0].product_handle;
    await f.run();
  });
  it("resolves an engravable handle through the nested variant product", async () => {
    const f = fixture();
    delete f.cart.items[0].product_handle;
    f.cart.items[0].variant = { product: { id: "prod_a" } };
    await f.run();
  });
  it("accepts an engravable watch without any engraving payload", async () => {
    const f = fixture();
    f.cart.items[0].metadata = {};
    await f.run();
  });
  it.each(["text", "font", "source_cart_id"])(
    "rejects tampered %s",
    async (field) => {
      const f = fixture();
      (f.cart.items[0].metadata.engraving as Record<string, unknown>)[field] =
        field === "text" ? "unsafe <script>" : "wrong";
      await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    },
  );
  it("rejects engraving metadata on a non-engraveable product", async () => {
    const f = fixture();
    f.cart.items[0].product_handle = "ellery-everyday";
    f.graph.mockImplementation(async ({ entity }) => ({
      data:
        entity === "order_cart"
          ? []
          : [{ id: "prod_a", handle: "ellery-everyday", metadata: { engraveable: false } }],
    }));
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it.each([undefined, "pp_system_default"])(
    "rejects missing/unknown provider %s",
    async (provider_id) => {
      const f = fixture();
      f.cart.payment_collection.payment_sessions.push({ provider_id });
      await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    },
  );
  it("accepts the same engraving repeated across multiple lines", async () => {
    const f = fixture();
    f.cart.items.push(structuredClone(f.cart.items[0]));
    await f.run();
  });
  it("bounds the whole hook including hanging association query", async () => {
    jest.useFakeTimers();
    const f = fixture();
    f.graph.mockImplementation(() => new Promise(() => {}));
    const check = expect(f.run()).rejects.toBeInstanceOf(
      CheckoutCompletionError,
    );
    await jest.advanceTimersByTimeAsync(35001);
    await check;
    expect(jest.getTimerCount()).toBe(0);
  });
  it.each([false, undefined])(
    "requires strict registered account state %s",
    async (has_account) => {
      const f = fixture();
      welcome(f);
      f.cart.customer.has_account = has_account;
      await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    },
  );
  it.each([
    "email",
    "customer",
    "rule",
    "status",
    "expired",
    "future",
    "budget",
    "limit",
    "used",
    "no-adjustment",
    "no-link",
    "wrong-id",
    "unknown-code",
  ])("rejects unsafe welcome %s", async (mutation) => {
    const f = fixture();
    welcome(f);
    if (mutation === "email") f.cart.email = "other@example.com";
    if (mutation === "customer") f.cart.customer.id = "cus_other";
    if (mutation === "rule") f.promotion.rules = [];
    if (mutation === "status") f.promotion.status = "inactive";
    if (mutation === "expired")
      f.promotion.campaign.ends_at = new Date(0) as any;
    if (mutation === "future")
      f.promotion.campaign.starts_at = new Date(Date.now() + 60000) as any;
    if (mutation === "budget") f.promotion.campaign.budget.type = "spend";
    if (mutation === "limit") f.promotion.campaign.budget.limit = 2;
    if (mutation === "used") f.promotion.campaign.budget.used = 1;
    if (mutation === "no-adjustment") f.cart.items[0].adjustments = [];
    if (mutation === "no-link") f.cart.promotions = [];
    if (mutation === "wrong-id")
      f.cart.items[0].adjustments[0].promotion_id = "promo_wrong";
    if (mutation === "unknown-code")
      f.cart.items[0].adjustments[0].code = "ART15-UNKNOWN";
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it("covers shipping-only welcome adjustments and canonical normalized emails", async () => {
    const f = fixture();
    welcome(f);
    f.cart.shipping_methods = [{ adjustments: f.cart.items[0].adjustments }];
    f.cart.items[0].adjustments = [];
    await f.run();
  });
  it("preserves an existing order link retry even after business references change", async () => {
    const f = fixture();
    f.cart.completed_at = "today";
    f.cart.items = null;
    f.graph.mockResolvedValue({ data: [{ order_id: "order_a" }] } as any);
    await f.run();
  });
  it.each([
    ["closed metadata", [{ metadata: { orders_open: false } }]],
    ["missing metadata", [{ metadata: null }]],
    ["no store record", []],
  ])("blocks an unpaid cart while orders are closed (%s)", async (_label, storesResult) => {
    const f = fixture();
    f.stores.listStores.mockResolvedValue(storesResult as any);
    await expect(f.run()).rejects.toMatchObject({
      message: expect.stringContaining("Orders are not open"),
    });
  });
  it.each(["authorized", "captured"])(
    "still completes a cart whose Stripe session is already %s while orders are closed",
    async (status) => {
      const f = fixture();
      f.stores.listStores.mockResolvedValue([{ metadata: null }] as any);
      f.cart.payment_collection.payment_sessions = [
        { provider_id: "pp_stripe_stripe", status },
      ];
      await f.run();
    },
  );
  it("closed orders do not strand a payment behind the store lookup itself", async () => {
    const f = fixture();
    f.cart.payment_collection.payment_sessions = [
      { provider_id: "pp_stripe_stripe", status: "authorized" },
    ];
    f.stores.listStores.mockRejectedValue(new Error("store unavailable"));
    await f.run();
  });
  it("completed_at alone cannot skip validation", async () => {
    const f = fixture();
    f.cart.completed_at = "today";
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it("rejects old accounts despite a forged future metadata expiry", async () => {
    const f = fixture();
    welcome(f);
    f.cart.customer.created_at = new Date(
      Date.now() - 31 * 86400000,
    ).toISOString();
    f.cart.customer.metadata = { welcome_discount_valid_until: "2099-01-01" };
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
});
