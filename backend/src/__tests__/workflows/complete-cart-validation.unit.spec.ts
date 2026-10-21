import { PaymentActions } from "@medusajs/framework/utils";
import {
  completeCartWorkflow,
  processPaymentWorkflow,
} from "@medusajs/medusa/core-flows";
import { POST as completeHTTP } from "../../api/store/carts/[id]/complete/route";
import { completionWorkflowFixture as harness } from "./completion-workflow-fixture";
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn(async () => ({ id: "cart_a" })),
}));
describe("installed complete-cart validation hook and native entries", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  it("registers only the public validate hook once when the loader module is imported repeatedly", () => {
    require("../../workflows/hooks/complete-cart-validation");
    expect(typeof completeCartWorkflow.hooks.validate).toBe("function");
    expect(completeCartWorkflow.getName()).toBe("complete-cart");
  });
  it("HTTP invokes engine complete-cart and creates a mock order after reading the immutable snapshot", async () => {
    const h = harness();
    await completeHTTP(h.req, h.res);
    expect(h.run).toHaveBeenCalledWith(
      "complete-cart",
      expect.objectContaining({ input: { id: "cart_a" } }),
    );
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.res.status).toHaveBeenCalledWith(200);
    expect(h.req.queryConfig.fields).not.toContain("metadata");
    expect(h.events[0]).toBe("identity:cart-identity:cart_a");
    expect(h.events.at(-1)).toBe("identity-released:cart-identity:cart_a");
  });
  it("native payment callback dispatches the same engine ID and rejects tampered engraving metadata", async () => {
    const h = harness();
    h.cart.items[0].metadata.engraving.font = "invalid";
    await processPaymentWorkflow(h.container).run({
      input: {
        action: PaymentActions.AUTHORIZED,
        data: { session_id: "ps_a", amount: 85 },
      },
    });
    expect(h.run).toHaveBeenCalledWith("complete-cart", {
      input: { id: "cart_a" },
    });
    expect(h.order.createOrders).not.toHaveBeenCalled();
    expect(h.events).toEqual([
      "acquire:cart_a",
      "release:cart_a",
      "acquire:cart_a",
      "release:cart_a",
    ]);
  });
  it("native ID dispatch accepts an engravable watch without an engraving payload", async () => {
    const h = harness();
    h.cart.items[0].metadata = {};
    await h.engine.run("complete-cart", { input: { id: "cart_a" } });
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
  });
  it.each(["text", "font", "source_cart_id", "provider"])(
    "native ID dispatch rejects unsafe %s before order or usage",
    async (mutation) => {
      const h = harness();
      if (mutation === "text")
        h.cart.items[0].metadata.engraving.text = "not allowed <script>";
      if (mutation === "font")
        h.cart.items[0].metadata.engraving.font = "invalid";
      if (mutation === "source_cart_id")
        h.cart.items[0].metadata.engraving.source_cart_id = "cart_b";
      if (mutation === "provider")
        h.cart.payment_collection.payment_sessions[0].provider_id =
          "pp_system_default";
      const result = await h.engine.run("complete-cart", {
        input: { id: "cart_a" },
        throwOnError: false,
      });
      expect(result.errors[0].error).toMatchObject({
        type: mutation === "provider" ? "not_allowed" : "invalid_data",
      });
      expect(h.order.createOrders).not.toHaveBeenCalled();
      expect(h.promotion.registerUsage).not.toHaveBeenCalled();
    },
  );
  it("HTTP surfaces known policy errors while keeping native authorization and no-store", async () => {
    const h = harness();
    h.cart.items[0].metadata.engraving.font = "invalid";
    await completeHTTP(h.req, h.res);
    expect(h.res.status).toHaveBeenCalledWith(400);
    expect(h.res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("native order-link retries preserve a committed order without re-validating changed metadata", async () => {
    const h = harness();
    await h.engine.run("complete-cart", { input: { id: "cart_a" } });
    h.cart.items[0].metadata = { engraving: { text: "x", font: "nope" } };
    await completeHTTP(h.req, h.res);
    expect(h.res.status).toHaveBeenCalledWith(200);
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.promotion.registerUsage).not.toHaveBeenCalled();
  });
  it("existing-order retry still requires HTTP authorization", async () => {
    const h = harness();
    await h.engine.run("complete-cart", { input: { id: "cart_a" } });
    h.run.mockClear();
    h.req.auth_context.actor_id = "cus_other";
    await completeHTTP(h.req, h.res);
    expect(h.res.status).toHaveBeenCalledWith(403);
    expect(h.run).not.toHaveBeenCalled();
  });
  it("simultaneous HTTP and payment callback with duplicate adjustments create one mock order and consume usage once", async () => {
    const h = harness();
    h.cart.customer.created_at = new Date().toISOString();
    h.cart.promotions = [{ id: "promo_a" }];
    h.cart.items[0].adjustments = [0, 1].map((i) => ({
      id: `adj_${i}`,
      promotion_id: "promo_a",
      code: "ART15-SAFE",
      amount: 7.5,
    }));
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((r) => {
      started = r;
    });
    const gate = new Promise<void>((r) => {
      release = r;
    });
    h.store.listStores.mockImplementationOnce(async () => {
      started();
      await gate;
      return [{ id: "store_a", metadata: { orders_open: true } }];
    });
    const http = completeHTTP(h.req, h.res);
    await entered;
    const callback = processPaymentWorkflow(h.container).run({
      input: {
        action: PaymentActions.AUTHORIZED,
        data: { session_id: "ps_a", amount: 85 },
      },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(h.order.createOrders).not.toHaveBeenCalled();
    release();
    await http;
    await callback;
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.promotion.registerUsage).toHaveBeenCalledTimes(1);
    expect(h.promotion.revertUsage).not.toHaveBeenCalled();
    expect(h.store.listStores).toHaveBeenCalledTimes(1);
    expect(h.linked()).toBe("order_a");
    await processPaymentWorkflow(h.container).run({
      input: {
        action: PaymentActions.AUTHORIZED,
        data: { session_id: "ps_a", amount: 85 },
      },
    });
    expect(h.order.createOrders).toHaveBeenCalledTimes(1);
    expect(h.promotion.registerUsage).toHaveBeenCalledTimes(1);
  });
  it("a downstream native payment failure compensates the mock order/link/completed state and registered usage", async () => {
    const h = harness();
    h.cart.customer.created_at = new Date().toISOString();
    h.cart.promotions = [{ id: "promo_a" }];
    h.cart.items[0].adjustments = [
      { promotion_id: "promo_a", code: "ART15-SAFE", amount: 15 },
    ];
    h.payment.authorizePaymentSession.mockRejectedValueOnce(
      new Error("isolated downstream failure"),
    );
    const result = await h.engine.run("complete-cart", {
      input: { id: "cart_a" },
      throwOnError: false,
    });
    expect(result.errors[0].error).toMatchObject({
      type: "payment_authorization_error",
    });
    expect(h.promotion.registerUsage).toHaveBeenCalledTimes(1);
    expect(h.promotion.revertUsage).toHaveBeenCalledTimes(1);
    expect(h.order.deleteOrders).toHaveBeenCalledTimes(1);
    expect(h.cart.completed_at).toBeNull();
    expect(h.linked()).toBeUndefined();
  });
});
