/** Mini cart quantity rules shared by the panel and its tests. */
export const MINI_CART_MIN_QTY = 1;
export const MINI_CART_MAX_QTY = 99;

/** Clamp a requested quantity to the purchasable 1–99 range. */
export function clampQuantity(value: number): number {
  if (Number.isNaN(value) || value === Number.NEGATIVE_INFINITY) return MINI_CART_MIN_QTY;
  if (value === Number.POSITIVE_INFINITY) return MINI_CART_MAX_QTY;
  if (!Number.isFinite(value)) return MINI_CART_MIN_QTY;
  return Math.min(MINI_CART_MAX_QTY, Math.max(MINI_CART_MIN_QTY, Math.trunc(value)));
}
