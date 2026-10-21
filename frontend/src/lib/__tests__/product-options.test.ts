import { findSelectedVariant } from "../product-options";
import { engravingSummary } from "../engraving";
import type { StoreProduct } from "../types";

describe("variant matching", () => {
  const product = {
    options: [{ id: "size" }, { id: "frame" }],
    variants: [
      { id: "missing_options", options: [] },
      { id: "incomplete", options: [{ option_id: "size", value: "Small" }] },
      {
        id: "correct",
        options: [
          { option_id: "size", value: "Small" },
          { option_id: "frame", value: "Oak" },
        ],
      },
    ],
  } as StoreProduct;
  it("does not let incomplete variant data match any combination", () => {
    expect(
      findSelectedVariant(product, { size: "Small", frame: "Oak" })?.id,
    ).toBe("correct");
    expect(
      findSelectedVariant(product, { size: "Small", frame: "Black" }),
    ).toBeNull();
    expect(findSelectedVariant(product, { size: "Small" })).toBeNull();
  });
});

describe("engraving metadata", () => {
  it("returns the engraving text and font, rejecting unsafe text or fonts", () => {
    expect(
      engravingSummary({
        engraving: { text: "For Dad, 2026", font: "serif" },
      }),
    ).toMatchObject({ text: "For Dad, 2026", font: "Roman Serif" });
    expect(
      engravingSummary({ engraving: { text: "unsafe <script>", font: "serif" } }),
    ).toBeNull();
    expect(
      engravingSummary({ engraving: { text: "For Dad", font: "unknown" } }),
    ).toBeNull();
    expect(engravingSummary(null)).toBeNull();
  });
});
