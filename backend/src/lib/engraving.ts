import { engraveableWatchHandles } from "./watch-prices";

export const MAX_ENGRAVING_CHARS = 20;
export const ENGRAVING_FONTS = ["script", "serif", "sans"] as const;
/** Uppercase/lowercase letters, digits, spaces, and safe engraver punctuation. */
const ENGRAVING_TEXT_PATTERN = /^[A-Za-z0-9 .,:'"&\-()/]+$/;

export type EngravingCustomization = {
  engraving_id: string;
  text: string;
  font: (typeof ENGRAVING_FONTS)[number];
  source_cart_id: string;
  notes?: string;
};

export function isEngraveableHandle(handle: unknown): boolean {
  return typeof handle === "string" && engraveableWatchHandles.has(handle);
}

export function validEngravingText(text: unknown): text is string {
  return (
    typeof text === "string" &&
    text.length >= 1 &&
    text.length <= MAX_ENGRAVING_CHARS &&
    ENGRAVING_TEXT_PATTERN.test(text)
  );
}

export function validEngravingFont(font: unknown): font is (typeof ENGRAVING_FONTS)[number] {
  return ENGRAVING_FONTS.includes(font as (typeof ENGRAVING_FONTS)[number]);
}

/**
 * A cart is payment-ready when every engraved line item carries a complete,
 * cart-bound engraving payload, and no non-engraveable product carries one.
 * Engraveable products without an engraving payload are fine: engraving is
 * optional at add-to-cart time.
 */
export const ENGRAVING_CART_FIELDS = ["id", "items.metadata", "items.variant.product.handle"];
type EngravingCart = { items?: ({ variant?: { product?: { handle?: string | null } | null } | null; metadata?: Record<string, unknown> | null } | null)[] | null };
export function engravingCartReady(cart: EngravingCart, cartId: string): boolean {
  return (cart.items || []).every((item) => {
    if (!item) return true;
    const engraving = item.metadata?.engraving as Record<string, unknown> | undefined;
    if (!engraving) return true;
    if (!isEngraveableHandle(item.variant?.product?.handle)) return false;
    return (
      validEngravingText(engraving.text) &&
      validEngravingFont(engraving.font) &&
      engraving.source_cart_id === cartId
    );
  });
}

/** Only customer-facing customization fields may leave the authenticated order API. */
export function publicEngravingMetadata(metadata: unknown) {
  const engraving = (metadata as { engraving?: Record<string, unknown> } | null)
    ?.engraving;
  if (!engraving || !validEngravingText(engraving.text) || !validEngravingFont(engraving.font))
    return undefined;
  const result: Record<string, unknown> = {
    text: engraving.text,
    font: engraving.font,
  };
  if (typeof engraving.source_cart_id === "string")
    result.source_cart_id = engraving.source_cart_id;
  if (typeof engraving.notes === "string")
    result.notes = engraving.notes.slice(0, 1000);
  return { engraving: result };
}
