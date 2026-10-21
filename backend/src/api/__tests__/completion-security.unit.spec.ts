import { POST as complete } from "../store/carts/[id]/complete/route";
import { POST as claim } from "../store/carts/[id]/customer/route";
import { CheckoutCompletionError } from "../../lib/checkout-completion";
import { issueAccessToken } from "../../lib/access-tokens";
import { deferred } from "../../__tests__/workflows/cart-wrapper-fixture";

const native = jest.fn();
jest.mock("@medusajs/medusa/api/store/carts/[id]/complete/route", () => ({
  POST: (...args) => native(...args),
}));
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn(async () => ({ id: "cart_a" })),
}));

function setup() {
  const cart = {
    id: "cart_a",
    customer_id: null,
    completed_at: null,
    metadata: {},
  } as any;
  const held = new Map<string, ReturnType<typeof deferred>>();
  const events: string[] = [];
  const locking = {
    execute: jest.fn(async (key: string, job: () => Promise<unknown>) => {
      while (held.has(key)) await held.get(key)!.promise;
      const gate = deferred();
      held.set(key, gate);
      events.push(`acquire:${key}`);
      try {
        return await job();
      } finally {
        held.delete(key);
        gate.resolve();
        events.push(`release:${key}`);
      }
    }),
  };
  const query = {
    graph: jest.fn(async () => {
      events.push(`query:${[...held.keys()].join(",")}`);
      return { data: [structuredClone(cart)] };
    }),
  };
  const engine = { run: jest.fn(async () => ({})) };
  const files = {
    createFiles: jest.fn(async () => ({ id: "file_new" })),
    deleteFiles: jest.fn(),
  };
  const carts = {
    updateCarts: jest.fn(async (_id, update) => {
      Object.assign(cart, update);
    }),
  };
  const req = {
    params: { id: cart.id },
    headers: { "x-cart-access-token": issueAccessToken("cart", cart.id) },
    body: {},
    validatedBody: {},
    queryConfig: { fields: ["id"] },
    query: {},
    scope: {
      resolve: (key) =>
        ({ query, workflows: engine, locking, file: files, cart: carts })[key],
    },
  } as any;
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    destroyed: false,
    headersSent: false,
  } as any;
  return { cart, held, locking, query, engine, files, carts, req, res, events };
}

describe("completion authorization and mutation boundaries", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
    native.mockReset();
  });
  it("checks authorization only after acquiring the identity lock", async () => {
    const h = setup();
    h.req.headers = {};
    await complete(h.req, h.res);
    expect(h.events).toEqual([
      "acquire:cart-identity:cart_a",
      "query:cart-identity:cart_a",
      "release:cart-identity:cart_a",
    ]);
    expect(h.res.status).toHaveBeenCalledWith(403);
    expect(native).not.toHaveBeenCalled();
  });
  it("keeps the identity lock until native completion settles after browser disconnect, including a waiting claim", async () => {
    const h = setup(),
      entered = deferred(),
      finish = deferred();
    native.mockImplementation(async () => {
      entered.resolve();
      await finish.promise;
    });
    const running = complete(h.req, h.res);
    await entered.promise;
    h.res.destroyed = true;
    const claimRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const claiming = claim(
      { ...h.req, auth_context: { actor_id: "cus_real" } },
      claimRes,
    );
    await Promise.resolve();
    expect(h.engine.run).not.toHaveBeenCalled();
    expect(h.held.has("cart-identity:cart_a")).toBe(true);
    finish.resolve();
    await running;
    await claiming;
    expect(h.engine.run).toHaveBeenCalledWith(
      "cansoria-claim-cart",
      expect.objectContaining({
        input: expect.objectContaining({ customer_id: "cus_real" }),
      }),
    );
    expect(h.held.size).toBe(0);
    expect(h.locking.execute.mock.calls.map(([key]) => key)).toEqual([
      "cart-identity:cart_a",
      "cart-identity:cart_a",
    ]);
  });
  it.each([400, 403])(
    "maps known policy status %s without treating failures as permission",
    async (status) => {
      const h = setup();
      native.mockRejectedValue(
        new CheckoutCompletionError("policy rejected", status as 400 | 403),
      );
      await complete(h.req, h.res);
      expect(h.res.status).toHaveBeenCalledWith(status);
      expect(h.res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "policy rejected" }),
      );
    },
  );
  it.each([new Error("backend unavailable"), null])(
    "keeps an unknown exception unavailable",
    async (error) => {
      const h = setup();
      native.mockRejectedValue(error);
      await complete(h.req, h.res);
      expect(h.res.status).toHaveBeenCalledWith(503);
    },
  );
});
