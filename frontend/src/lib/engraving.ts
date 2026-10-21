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

export const engraveableWatchHandles = [
  "heritage-classic-40",
  "meridian-automatic",
  "regent-chronograph",
  "averly-dress-watch",
  "northsea-diver",
  "lucienne-slim-32",
] as const;

export type EngravingCustomization = {
  text: string;
  font: EngravingFont;
  notes?: string;
};

export function isEngraveableHandle(handle: string | null | undefined): boolean {
  return (
    typeof handle === "string" &&
    (engraveableWatchHandles as readonly string[]).includes(handle)
  );
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
