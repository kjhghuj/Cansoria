import { describe, expect, it } from "@jest/globals";
import { clampQuantity, MINI_CART_MIN_QTY, MINI_CART_MAX_QTY } from "@/lib/mini-cart";

describe("clampQuantity", () => {
  it("keeps quantities inside the purchasable range", () => {
    expect(clampQuantity(1)).toBe(1);
    expect(clampQuantity(5)).toBe(5);
    expect(clampQuantity(MINI_CART_MAX_QTY)).toBe(MINI_CART_MAX_QTY);
  });

  it("clamps out-of-range values to the nearest bound", () => {
    expect(clampQuantity(0)).toBe(MINI_CART_MIN_QTY);
    expect(clampQuantity(-3)).toBe(MINI_CART_MIN_QTY);
    expect(clampQuantity(100)).toBe(MINI_CART_MAX_QTY);
    expect(clampQuantity(9999)).toBe(MINI_CART_MAX_QTY);
  });

  it("normalises non-finite input to the minimum", () => {
    expect(clampQuantity(Number.NaN)).toBe(MINI_CART_MIN_QTY);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(MINI_CART_MAX_QTY);
    expect(clampQuantity(2.9)).toBe(2);
  });
});
