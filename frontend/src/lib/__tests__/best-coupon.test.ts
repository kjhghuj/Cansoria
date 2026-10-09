import { applyBestCoupon } from "../best-coupon";
import type { StoreCart } from "../types";

describe("saved coupon trials", () => {
  const cart = {
    id: "cart_test",
    items: [{ id: "item_a", quantity: 1 }],
    promotions: [],
    discount_total: 0,
  } as unknown as StoreCart;
  it("removes every trial before choosing the largest discount", async () => {
    const apply = jest.fn(
      async (code: string) =>
        ({
          ...cart,
          promotions: [{ code }],
          discount_total: code === "BIG" ? 20 : 5,
        }) as StoreCart,
    );
    const remove = jest.fn(async () => cart);
    const result = await applyBestCoupon(cart, ["small", "BIG", "big", null], {
      apply,
      remove,
    });
    expect(result.discount_total).toBe(20);
    expect(apply.mock.calls.map((call) => call[0])).toEqual([
      "SMALL",
      "BIG",
      "BIG",
    ]);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(
      apply.mock.invocationCallOrder[1],
    );
  });
  it("leaves a manually applied promotion in place", async () => {
    const apply = jest.fn();
    const remove = jest.fn();
    const existing = { ...cart, promotions: [{ code: "CHOSEN" }] } as StoreCart;
    expect(await applyBestCoupon(existing, ["OTHER"], { apply, remove })).toBe(
      existing,
    );
    expect(apply).not.toHaveBeenCalled();
  });
  it("aborts trials if cleanup fails, so discounts cannot stack", async () => {
    const apply = jest.fn(
      async () =>
        ({
          ...cart,
          promotions: [{ code: "FIRST" }],
          discount_total: 5,
        }) as StoreCart,
    );
    const remove = jest.fn(async () => {
      throw new Error("Network unavailable");
    });
    await expect(
      applyBestCoupon(cart, ["FIRST", "SECOND"], { apply, remove }),
    ).rejects.toThrow("Network unavailable");
    expect(apply).toHaveBeenCalledTimes(1);
  });
  it("skips invalid codes but stops on ambiguous network failures", async () => {
    const apply = jest
      .fn()
      .mockRejectedValueOnce(
        new Error("The promo code is invalid or unavailable."),
      )
      .mockRejectedValueOnce(new Error("Network unavailable"));
    const remove = jest.fn();
    await expect(
      applyBestCoupon(cart, ["EXPIRED", "NETWORK", "NEXT"], { apply, remove }),
    ).rejects.toThrow("Network unavailable");
    expect(apply).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
  });
});
