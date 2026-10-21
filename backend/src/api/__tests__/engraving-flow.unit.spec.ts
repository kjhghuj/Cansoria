import { POST as addEngraved } from "../store/carts/[id]/engraving-items/route";
import { issueAccessToken } from "../../lib/access-tokens";
import { paymentAccessGuard } from "../../lib/resource-access";
import { engravingCartReady } from "../../lib/engraving";

const run = jest.fn().mockResolvedValue({});
jest.mock("@medusajs/medusa/core-flows", () => ({
  addToCartWorkflow: jest.fn(() => ({ run: (...args) => run(...args) })),
}));
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn().mockResolvedValue({ id: "cart_a", items: [] }),
}));
function setup() {
  const cart = {
    id: "cart_a",
    customer_id: null,
    completed_at: null,
    items: [],
  } as any;
  const graph = jest.fn(async (args) => ({
    data:
      args.entity === "product_variant"
        ? [
            {
              id: "variant_a",
              product: { handle: "meridian-automatic" },
            },
          ]
        : [cart],
  }));
  const req = {
    params: { id: cart.id },
    headers: { "x-cart-access-token": issueAccessToken("cart", cart.id) },
    body: {},
    scope: {
      resolve: (key) =>
        ({
          query: { graph },
          locking: { execute: async (_key, fn) => fn() },
        })[key],
    },
  } as any;
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  } as any;
  return { req, res, cart, graph };
}
describe("engraving items and order association", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
    jest.clearAllMocks();
  });
  it("rejects incomplete engraving metadata before initializing a payment", async () => {
    const { req, res, cart } = setup();
    req.method = "POST"; req.params = {}; req.originalUrl = "/store/payment-collections"; req.body = { cart_id: cart.id };
    cart.items = [{ variant: { product: { handle: "meridian-automatic" } }, metadata: { engraving: { text: "For Dad", font: "unknown" } } }];
    const next = jest.fn(); await paymentAccessGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400); expect(next).not.toHaveBeenCalled();
  });
  it("allows an engravable watch without engraving at payment time", () => {
    expect(engravingCartReady({
      items: [{ variant: { product: { handle: "meridian-automatic" } }, metadata: {} }],
    } as any, "cart_a")).toBe(true);
    expect(engravingCartReady({
      items: [{ variant: { product: { handle: "ellery-everyday" } }, metadata: {} }],
    } as any, "cart_a")).toBe(true);
  });
  it("rejects engraving metadata bound to another cart or a non-engraveable product", () => {
    expect(engravingCartReady({
      items: [{ variant: { product: { handle: "meridian-automatic" } }, metadata: { engraving: { text: "For Dad", font: "serif", source_cart_id: "cart_b" } } }],
    } as any, "cart_a")).toBe(false);
    expect(engravingCartReady({
      items: [{ variant: { product: { handle: "ellery-everyday" } }, metadata: { engraving: { text: "For Dad", font: "serif", source_cart_id: "cart_a" } } }],
    } as any, "cart_a")).toBe(false);
  });
  it("keeps engravings separate and prices under the standard workflow", async () => {
    const { req, res } = setup();
    req.body = {
      variant_id: "variant_a",
      quantity: 1,
      text: "For Dad, 2026",
      font: "serif",
      notes: "Please center the text",
      unit_price: 1,
    };
    await addEngraved(req, res);
    await addEngraved(req, res);
    const first = run.mock.calls[0][0].input.items[0],
      second = run.mock.calls[1][0].input.items[0];
    expect(first.metadata.engraving).toMatchObject({
      text: "For Dad, 2026",
      font: "serif",
      source_cart_id: "cart_a",
      notes: "Please center the text",
    });
    expect(first.metadata.engraving.engraving_id).not.toBe(
      second.metadata.engraving.engraving_id,
    );
    expect(first).not.toHaveProperty("unit_price");
  });
  it("rejects an invalid font, unsafe text, or a non-engraveable product", async () => {
    const { req, res } = setup();
    req.body = {
      variant_id: "variant_a",
      quantity: 1,
      text: "For Dad, 2026",
      font: "invalid",
    };
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(run).not.toHaveBeenCalled();
    res.status.mockClear();
    req.body.font = "serif";
    req.body.text = "way too long for a caseback engraving";
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(run).not.toHaveBeenCalled();
    res.status.mockClear();
    req.body.text = "For Dad <script>";
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects an engraving on a product that is not engravable", async () => {
    const { req, res, graph } = setup();
    graph.mockImplementation(async () => ({
      data: [{ id: "variant_a", product: { handle: "ellery-everyday" } }],
    }));
    req.body = {
      variant_id: "variant_a",
      quantity: 1,
      text: "For Dad",
      font: "serif",
    };
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(run).not.toHaveBeenCalled();
  });
  it("denies the add without cart ownership", async () => {
    const { req, res } = setup();
    req.headers = {};
    req.body = { variant_id: "variant_a", quantity: 1, text: "For Dad", font: "serif" };
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects an engraving on a completed cart", async () => {
    const { req, res, cart } = setup();
    cart.completed_at = "today";
    req.body = { variant_id: "variant_a", quantity: 1, text: "For Dad", font: "serif" };
    await addEngraved(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(run).not.toHaveBeenCalled();
  });
});
