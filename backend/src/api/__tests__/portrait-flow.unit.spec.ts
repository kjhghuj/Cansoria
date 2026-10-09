import { POST as upload } from "../store/carts/[id]/photos/route";
import { GET as read } from "../store/carts/[id]/photos/[photoId]/route";
import { POST as addPortrait } from "../store/carts/[id]/portrait-items/route";
import { serveOrderPhoto } from "../../lib/order-photos";
import { signPhoto } from "../../lib/portrait-photos";
import { issueAccessToken } from "../../lib/access-tokens";
import { paymentAccessGuard } from "../../lib/resource-access";

const run = jest.fn().mockResolvedValue({});
jest.mock("@medusajs/medusa/core-flows", () => ({
  addToCartWorkflow: jest.fn(() => ({ run: (...args) => run(...args) })),
}));
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn().mockResolvedValue({ id: "cart_a", items: [] }),
}));
function setup() {
  const photo = signPhoto({
    id: "2c0e1371-36f3-40a7-b8c7-861f3c185559",
    cart_id: "cart_a",
    file_id: "private-ref.png",
    name: "pet.png",
    mime: "image/png",
    size: 9,
  });
  const cart = {
    id: "cart_a",
    customer_id: null,
    completed_at: null,
    metadata: { portrait_photos: [photo] },
  } as any;
  const order = {
    id: "order_a",
    customer_id: "cus_owner",
    cart: { id: cart.id },
    metadata: cart.metadata,
    items: [{ metadata: { portrait: { photo_id: photo.id } } }],
  } as any;
  const graph = jest.fn(async (args) => ({
    data:
      args.entity === "order"
        ? [order]
        : args.entity === "product_variant"
          ? [
              {
                id: "variant_a",
                product: { handle: "pet-portrait-oil-painting" },
              },
            ]
          : [cart],
  }));
  const files = {
    createFiles: jest.fn().mockResolvedValue({ id: "private-new.png" }),
    deleteFiles: jest.fn(),
    getAsBuffer: jest.fn().mockResolvedValue(Buffer.from("image")),
  };
  const carts = {
    updateCarts: jest.fn(async (_id, value) => {
      cart.metadata = value.metadata;
    }),
  };
  const req = {
    params: { id: cart.id, photoId: photo.id },
    headers: { "x-cart-access-token": issueAccessToken("cart", cart.id) },
    body: {},
    scope: {
      resolve: (key) =>
        ({
          query: { graph },
          file: files,
          cart: carts,
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
  return { req, res, cart, order, files, carts, photo, graph };
}
describe("portrait upload and order association", () => {
  it("rejects incomplete portrait metadata before initializing a payment", async () => {
    const { req, res, cart } = setup();
    req.method = "POST"; req.params = {}; req.originalUrl = "/store/payment-collections"; req.body = { cart_id: cart.id };
    cart.items = [{ variant: { product: { handle: "pet-portrait-oil-painting" } }, metadata: {} }];
    const next = jest.fn(); await paymentAccessGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400); expect(next).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
    jest.clearAllMocks();
  });
  function imageBody() {
    return {
      name: "pet.png",
      mime: "image/png",
      content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]).toString(
        "base64",
      ),
    };
  }
  it("denies upload without cart ownership before writing a file", async () => {
    const { req, res, files } = setup();
    req.headers = {};
    req.body = imageBody();
    await upload(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(files.createFiles).not.toHaveBeenCalled();
  });
  it("stores privately and records the validated photo on its cart", async () => {
    const { req, res, files, cart } = setup();
    req.body = imageBody();
    await upload(req, res);
    expect(files.createFiles).toHaveBeenCalledWith(
      expect.objectContaining({ access: "private", mimeType: "image/png" }),
    );
    expect(cart.metadata.portrait_photos).toHaveLength(2);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json.mock.calls[0][0].photo).not.toHaveProperty("file_id");
  });
  it("rolls back the stored file when cart persistence fails", async () => {
    const { req, res, files, carts } = setup();
    req.body = imageBody();
    carts.updateCarts.mockRejectedValue(new Error("database failure") as never);
    await upload(req, res);
    expect(files.deleteFiles).toHaveBeenCalledWith("private-new.png");
    expect(res.status).toHaveBeenCalledWith(503);
  });
  it("rejects upload to a completed cart", async () => {
    const { req, res, cart, files } = setup();
    cart.completed_at = "today";
    req.body = imageBody();
    await upload(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(files.createFiles).not.toHaveBeenCalled();
  });
  it("denies a forged storage key on a valid cart", async () => {
    const { req, res, cart, files } = setup();
    cart.metadata.portrait_photos[0].file_id = "victim.png";
    await read(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(files.getAsBuffer).not.toHaveBeenCalled();
  });
  it("keeps commissions separate and prices under the standard workflow", async () => {
    const { req, res, photo } = setup();
    req.body = {
      variant_id: "variant_a",
      quantity: 1,
      style: "dark-classic",
      photo_id: photo.id,
      notes: "Keep the collar",
      unit_price: 1,
    };
    await addPortrait(req, res);
    await addPortrait(req, res);
    const first = run.mock.calls[0][0].input.items[0],
      second = run.mock.calls[1][0].input.items[0];
    expect(first.metadata.portrait).toMatchObject({
      style: "dark-classic",
      photo_id: photo.id,
      photo_name: "pet.png",
      source_cart_id: "cart_a",
      notes: "Keep the collar",
    });
    expect(first.metadata.portrait.commission_id).not.toBe(
      second.metadata.portrait.commission_id,
    );
    expect(first).not.toHaveProperty("unit_price");
  });
  it("rejects another cart’s photo or an invalid painting style", async () => {
    const { req, res, photo, cart } = setup();
    req.body = {
      variant_id: "variant_a",
      quantity: 1,
      style: "invalid",
      photo_id: photo.id,
    };
    await addPortrait(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    req.body.style = "classic-oil";
    cart.metadata.portrait_photos = [];
    await addPortrait(req, res);
    expect(run).not.toHaveBeenCalled();
  });
  it("only serves an order’s linked reference to its owner or mailbox token holder", async () => {
    const { req, res, files, order } = setup();
    req.params.id = order.id;
    await serveOrderPhoto(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    req.headers["x-order-access-token"] = issueAccessToken("order", order.id);
    await serveOrderPhoto(req, res);
    expect(files.getAsBuffer).toHaveBeenCalledWith("private-ref.png");
    files.getAsBuffer.mockClear();
    order.cart.id = "cart_b";
    await serveOrderPhoto(req, res);
    expect(files.getAsBuffer).not.toHaveBeenCalled();
  });
  it("rejects an unlinked photo and a logged-in stranger", async () => {
    const { req, res, order, files } = setup();
    req.params.id = order.id;
    req.auth_context = { actor_id: "cus_stranger" };
    await serveOrderPhoto(req, res);
    expect(files.getAsBuffer).not.toHaveBeenCalled();
    req.auth_context.actor_id = order.customer_id;
    order.items = [];
    await serveOrderPhoto(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
