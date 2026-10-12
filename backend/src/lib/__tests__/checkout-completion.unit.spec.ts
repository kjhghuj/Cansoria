import { Readable } from "stream";
import { signPhoto, MAX_PHOTO_BYTES } from "../portrait-photos";
import {
  validateCheckoutCompletion,
  CheckoutCompletionError,
} from "../checkout-completion";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
function fixture() {
  const photo = signPhoto({
    id: "2c0e1371-36f3-40a7-b8c7-861f3c185559",
    cart_id: "cart_a",
    file_id: "file_a",
    name: "pet.png",
    mime: "image/png",
    size: png.length,
  });
  // Installed completeCartFields does not include nested product.handle or promotions.code.
  const cart = {
    id: "cart_a",
    email: "OWNER@example.com",
    metadata: { portrait_photos: [photo] },
    items: [
      {
        product_id: "prod_a",
        product_handle: "pet-portrait-oil-painting",
        variant: { product: { id: "prod_a" } },
        metadata: {
          portrait: {
            photo_id: photo.id,
            source_cart_id: "cart_a",
            style: "classic-oil",
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
          ? [{ id: "prod_a", handle: "pet-portrait-oil-painting" }]
          : (() => {
              throw new Error("Never replace the native cart snapshot");
            })(),
  }));
  const files = {
    getDownloadStream: jest.fn(async () => Readable.from([png])),
  };
  const promotions = { listPromotions: jest.fn(async () => [promotion]) };
  const stores = {
    listStores: jest.fn(async () => [{ metadata: { orders_open: true } }]),
  };
  const container = {
    resolve: (key) =>
      ({
        query: { graph },
        file: files,
        promotion: promotions,
        store: stores,
      })[key],
  } as any;
  return {
    cart,
    photo,
    promotion,
    graph,
    files,
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
    expect(f.files.getDownloadStream).toHaveBeenCalledWith("file_a");
  });
  it("resolves portrait identity when product_handle is absent", async () => {
    const f = fixture();
    delete f.cart.items[0].product_handle;
    f.cart.items[0].metadata = {};
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it.each(["style", "source_cart_id", "photo_id"])(
    "rejects tampered %s",
    async (field) => {
      const f = fixture();
      f.cart.items[0].metadata.portrait[field] = "wrong";
      await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
      expect(f.files.getDownloadStream).not.toHaveBeenCalled();
    },
  );
  it("rejects tampered signed registry", async () => {
    const f = fixture();
    f.photo.file_id = "victim";
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    expect(f.files.getDownloadStream).not.toHaveBeenCalled();
  });
  it.each([undefined, "pp_system_default"])(
    "rejects missing/unknown provider %s",
    async (provider_id) => {
      const f = fixture();
      f.cart.payment_collection.payment_sessions.push({ provider_id });
      await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    },
  );
  it("reads one referenced file once across multiple portrait lines", async () => {
    const f = fixture();
    f.cart.items.push(structuredClone(f.cart.items[0]));
    await f.run();
    expect(f.files.getDownloadStream).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["image/jpeg", "pet.jpg", Buffer.from([255, 216, 255, 1])],
    ["image/webp", "pet.webp", Buffer.from("RIFFxxxxWEBPbody")],
  ])(
    "accepts readable signed %s headers without claiming full decoding",
    async (mime, name, bytes) => {
      const f = fixture();
      f.cart.metadata.portrait_photos = [
        signPhoto({
          ...f.photo,
          mime: mime as string,
          name: name as string,
          size: (bytes as Buffer).length,
        }),
      ];
      f.files.getDownloadStream.mockResolvedValue(Readable.from([bytes]));
      await f.run();
    },
  );
  it("rejects more than 20 unique valid references before reading files", async () => {
    const f = fixture();
    f.cart.items = [];
    f.cart.metadata.portrait_photos = [];
    for (let i = 0; i < 21; i++) {
      const photo = signPhoto({
        ...f.photo,
        id: `${String(i).padStart(8, "0")}-36f3-40a7-b8c7-861f3c185559`,
        file_id: `file_${i}`,
      });
      f.cart.metadata.portrait_photos.push(photo);
      f.cart.items.push({
        product_id: "prod_a",
        variant: { product: { id: "prod_a" } },
        metadata: {
          portrait: {
            style: "classic-oil",
            source_cart_id: "cart_a",
            photo_id: photo.id,
          },
        },
        adjustments: [],
      });
    }
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    expect(f.files.getDownloadStream).not.toHaveBeenCalled();
  });
  it("bounds all sequential photos to 25 seconds and destroys a late final stream", async () => {
    jest.useFakeTimers();
    const f = fixture();
    f.cart.items = [];
    f.cart.metadata.portrait_photos = [];
    const streams: Readable[] = [];
    for (let i = 0; i < 6; i++) {
      const photo = signPhoto({
        ...f.photo,
        id: `${String(i).padStart(8, "0")}-36f3-40a7-b8c7-861f3c185559`,
        file_id: `file_${i}`,
      });
      f.cart.metadata.portrait_photos.push(photo);
      f.cart.items.push({
        product_id: "prod_a",
        variant: { product: { id: "prod_a" } },
        metadata: {
          portrait: {
            style: "classic-oil",
            source_cart_id: "cart_a",
            photo_id: photo.id,
          },
        },
        adjustments: [],
      });
    }
    f.files.getDownloadStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            const stream = Readable.from([png]);
            streams.push(stream);
            resolve(stream);
          }, 4500);
        }),
    );
    const check = expect(f.run()).rejects.toMatchObject({
      message: "Photo validation timed out",
    });
    await jest.advanceTimersByTimeAsync(25001);
    await check;
    expect(f.files.getDownloadStream).toHaveBeenCalledTimes(6);
    await jest.advanceTimersByTimeAsync(3000);
    expect(streams.every((s) => s.destroyed)).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it.each([
    Buffer.alloc(0),
    Buffer.from("not an image"),
    Buffer.concat([png, png]),
  ])("rejects empty, magic or signed-size mismatch", async (bytes) => {
    const f = fixture();
    f.files.getDownloadStream.mockImplementation(async () =>
      Readable.from([bytes]),
    );
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it("rejects unreadable storage instead of treating a signed URL as existence", async () => {
    const f = fixture();
    f.files.getDownloadStream.mockRejectedValue(new Error("missing"));
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
  });
  it("destroys an oversized stream without retaining its content", async () => {
    const f = fixture();
    const stream = Readable.from([Buffer.alloc(MAX_PHOTO_BYTES + 1)]);
    f.files.getDownloadStream.mockResolvedValue(stream);
    await expect(f.run()).rejects.toBeInstanceOf(CheckoutCompletionError);
    expect(stream.destroyed).toBe(true);
  });
  it("destroys a stalled stream at 5 seconds", async () => {
    jest.useFakeTimers();
    const f = fixture();
    const stream = new Readable({ read() {} });
    f.files.getDownloadStream.mockResolvedValue(stream);
    const check = expect(f.run()).rejects.toBeInstanceOf(
      CheckoutCompletionError,
    );
    await jest.advanceTimersByTimeAsync(5001);
    await check;
    expect(stream.destroyed).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it("destroys a stream which arrives after acquisition timed out", async () => {
    jest.useFakeTimers();
    const f = fixture();
    let resolve!: (s: Readable) => void;
    f.files.getDownloadStream.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const check = expect(f.run()).rejects.toBeInstanceOf(
      CheckoutCompletionError,
    );
    await jest.advanceTimersByTimeAsync(5001);
    await check;
    const stream = new Readable({ read() {} });
    resolve(stream);
    await Promise.resolve();
    expect(stream.destroyed).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
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
    expect(f.files.getDownloadStream).not.toHaveBeenCalled();
  });
  it.each([
    ["closed metadata", [{ metadata: { orders_open: false } }]],
    ["missing metadata", [{ metadata: null }]],
    ["no store record", []],
  ])("blocks an unpaid cart while orders are closed (%s)", async (_label, storesResult) => {
    const f = fixture();
    f.stores.listStores.mockResolvedValue(storesResult as any);
    await expect(f.run()).rejects.toMatchObject({
      message: expect.stringContaining("Commissions are not open"),
    });
    expect(f.files.getDownloadStream).not.toHaveBeenCalled();
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
