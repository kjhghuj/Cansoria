import type { StoreCart } from "./types";

interface CouponOperations {
  apply: (code: string) => Promise<StoreCart | null>;
  remove: (code: string) => Promise<StoreCart | null>;
}

// Stop if a temporary code cannot be removed, so trials never stack discounts.
export async function applyBestCoupon(
  cart: StoreCart,
  codes: unknown,
  operations: CouponOperations,
) {
  if (cart.promotions?.length || !cart.items?.length || !Array.isArray(codes))
    return cart;
  const candidates = [
    ...new Set(
      codes
        .filter(
          (code): code is string =>
            typeof code === "string" && /^[a-z0-9_-]{1,64}$/i.test(code),
        )
        .map((code) => code.toUpperCase()),
    ),
  ].slice(0, 20);
  let bestCode: string | null = null;
  let bestDiscount = 0;
  let current = cart;
  for (const code of candidates) {
    let trial: StoreCart | null;
    try {
      trial = await operations.apply(code);
    } catch (error) {
      if (
        error instanceof Error &&
        /promo code is invalid or unavailable/i.test(error.message)
      )
        continue;
      throw error;
    }
    if (!trial)
      throw new Error("Unable to check your saved codes. Please try again.");
    const applied = trial.promotions?.some(
      (promotion) => promotion.code?.toUpperCase() === code,
    );
    const discount = trial.discount_total ?? 0;
    if (applied && discount > bestDiscount) {
      bestCode = code;
      bestDiscount = discount;
    }
    const reset = await operations.remove(code);
    if (
      !reset ||
      reset.promotions?.some(
        (promotion) => promotion.code?.toUpperCase() === code,
      )
    )
      throw new Error(
        "Unable to restore your cart after checking a code. Please refresh before continuing.",
      );
    current = reset;
  }
  if (bestCode) {
    const finalCart = await operations.apply(bestCode);
    if (!finalCart)
      throw new Error("Unable to apply your saved code. Please try again.");
    current = finalCart;
  }
  return current;
}
