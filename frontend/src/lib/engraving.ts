// Mirrors backend/src/lib/engraving.ts and watch-prices.ts. Keep the handle
// list and validation rules in sync with the backend engraving-items route.
export const MAX_ENGRAVING_CHARS = 20;

export const engravingFonts = [
  {
    id: "script",
    name: "Classic Script",
    description: "Flowing cursive with an heirloom feel.",
  },
  {
    id: "serif",
    name: "Roman Serif",
    description: "Timeless capital letters, easy to read.",
  },
  {
    id: "sans",
    name: "Modern Sans",
    description: "Clean, contemporary lowercase-friendly lettering.",
  },
] as const;
export type EngravingFont = (typeof engravingFonts)[number]["id"];

/** Uppercase/lowercase letters, digits, spaces, and safe engraver punctuation. */
export const ENGRAVING_TEXT_PATTERN = /^[A-Za-z0-9 .,:'"&\-()/]+$/;

export type EngravingCustomization = {
  text: string;
  font: EngravingFont;
  notes?: string;
};

/**
 * The engraving capability is owned by the product record's
 * `metadata.engraveable` flag (mirrored from the backend catalog). Handle
 * lists are deliberately not consulted: renaming or adding a model must not
 * desync the card, detail page, and API.
 */
export function isEngraveableProduct(
  product:
    | { handle?: string | null; metadata?: Record<string, unknown> | null }
    | null
    | undefined,
): boolean {
  return Boolean(product && product.metadata?.engraveable === true);
}

export function validEngravingText(text: unknown): text is string {
  return (
    typeof text === "string" &&
    text.length >= 1 &&
    text.length <= MAX_ENGRAVING_CHARS &&
    ENGRAVING_TEXT_PATTERN.test(text)
  );
}

export function getEngravingFont(value: unknown): EngravingFont {
  return engravingFonts.find((font) => font.id === value)?.id || "serif";
}

export type EngravingSummary = {
  text: string;
  font: string;
  notes: string;
};

export function engravingSummary(
  metadata: Record<string, unknown> | null | undefined,
): EngravingSummary | null {
  const data = metadata?.engraving as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return null;
  if (!validEngravingText(data.text)) return null;
  const font = engravingFonts.find((item) => item.id === data.font);
  if (!font) return null;
  return {
    text: data.text,
    font: font.name,
    notes: typeof data.notes === "string" ? data.notes : "",
  };
}
