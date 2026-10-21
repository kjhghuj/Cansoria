import { cansoriaUpdateCartWorkflow } from "../../workflows/cansoria-update-cart";
import { cansoriaClaimCartWorkflow } from "../../workflows/cansoria-claim-cart";
import { cartWrapperFixture, deferred } from "./cart-wrapper-fixture";

describe("public cart parent workflows with actual native child SDK execution", () => {
  it("locks before preparation and skips all native child acquire/release locks", async () => {
    const h = cartWrapperFixture();
    await cansoriaUpdateCartWorkflow(h.container).run({
      input: {
        id: "cart_a",
        email: "registered@example.com",
        metadata: { note: "safe", preferences: { currency: "usd" } },
      },
    });
    expect(h.events[0]).toBe("acquire:cart_a");
    expect(h.events.at(-1)).toBe("release:cart_a");
    expect(h.locking.acquire).toHaveBeenCalledTimes(1);
    expect(h.locking.release).toHaveBeenCalledTimes(1);
    expect(h.cart.customer_id).toBe("cus_guest");
    expect(h.cart.email).toBe("registered@example.com");
    expect(h.cart.metadata).toEqual({
      note: "safe",
      preferences: { currency: "usd" },
    });
    expect(h.customers.listCustomers).toHaveBeenCalledWith({
      email: "registered@example.com",
      has_account: false,
    });
  });
  it("holds the parent cart lock across guest preselection and native email update", async () => {
    const h = cartWrapperFixture();
    h.controls.preselection = deferred();
    h.controls.proceed = deferred();
    const running = cansoriaUpdateCartWorkflow(h.container).run({
      input: { id: "cart_a", email: "registered@example.com" },
    });
    await h.controls.preselection.promise;
    expect(h.cart.customer_id).toBe("cus_guest");
    expect(h.cart.email).toBe("old@example.com");
    let observed: any;
    const callbackRead = h.locking.execute("cart_a", async () => {
      observed = structuredClone(h.cart);
    });
    await Promise.resolve();
    expect(observed).toBeUndefined();
    h.controls.proceed.resolve();
    await running;
    await callbackRead;
    expect(observed).toMatchObject({
      customer_id: "cus_guest",
      email: "registered@example.com",
    });
    expect(h.held.size).toBe(0);
  });
  it("native downstream failure compensates email, guest preselection, and metadata", async () => {
    const h = cartWrapperFixture();
    h.controls.failRefresh = true;
    const result = await cansoriaUpdateCartWorkflow(h.container).run({
      input: {
        id: "cart_a",
        email: "registered@example.com",
        metadata: { note: "changed" },
      },
      throwOnError: false,
    });
    expect(result.errors[0].error).toMatchObject({
      message: "isolated refresh failure",
    });
    expect(h.events).toContain("update:cus_guest:registered@example.com");
    expect(h.cart).toMatchObject({
      customer_id: h.original.customer_id,
      email: h.original.email,
      metadata: h.original.metadata,
    });
    expect(h.events.at(-1)).toBe("release:cart_a");
    expect(h.held.size).toBe(0);
  });
  it.each(["update", "claim"])(
    "rejects completed carts inside the parent lock before %s writes",
    async (kind) => {
      const h = cartWrapperFixture({ completed_at: "today" });
      const result =
        kind === "update"
          ? await cansoriaUpdateCartWorkflow(h.container).run({
              input: { id: "cart_a", email: "registered@example.com" },
              throwOnError: false,
            })
          : await cansoriaClaimCartWorkflow(h.container).run({
              input: { id: "cart_a", customer_id: "cus_real" },
              throwOnError: false,
            });
      expect(result.errors[0].error).toMatchObject({ type: "conflict" });
      expect(h.carts.updateCarts).not.toHaveBeenCalled();
      expect(h.locking.acquire).toHaveBeenCalledTimes(1);
      expect(h.held.size).toBe(0);
    },
  );
  it("claim queries native identity within the parent lock and restores it on a later native failure", async () => {
    const h = cartWrapperFixture();
    h.controls.failRefresh = true;
    const result = await cansoriaClaimCartWorkflow(h.container).run({
      input: { id: "cart_a", customer_id: "cus_real" },
      throwOnError: false,
    });
    expect(result.errors[0].error).toMatchObject({
      message: "isolated refresh failure",
    });
    expect(h.events[0]).toBe("acquire:cart_a");
    expect(h.events).toContain("update:cus_real:owner@example.com");
    expect(h.cart).toMatchObject({
      customer_id: h.original.customer_id,
      email: h.original.email,
      metadata: h.original.metadata,
    });
    expect(h.locking.acquire).toHaveBeenCalledTimes(1);
    expect(h.locking.release).toHaveBeenCalledTimes(1);
    expect(h.held.size).toBe(0);
  });
});
