import { findSelectedVariant } from "../product-options";
import { portraitSummary } from "../portrait";
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

describe("portrait imagery", () => {
  it("shows the saved style example and rejects arbitrary metadata paths", () => {
    expect(
      portraitSummary({
        portrait: { style: "soft-impression", photo_name: "pet.png" },
      })?.image,
    ).toBe("/images/pet-oil/soft-impression.webp");
    expect(
      portraitSummary({ portrait: { style: "../../private/photo" } })?.image,
    ).toBeNull();
    expect(portraitSummary(null)).toBeNull();
  });
});
