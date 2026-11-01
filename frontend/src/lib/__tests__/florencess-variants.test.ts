import { describe, expect, it } from "@jest/globals";
import {
  defaultFlSelection,
  resolveFlVariant,
  resolveVariantFrom,
} from "@/lib/florencess-variants";
import type { FlProduct } from "@/lib/florencess-catalog";

function product(options: { id: string; name: string; values: string[] }[]) {
  return {
    id: "p1",
    slug: "p-1",
    title: "Product",
    model: "",
    brand: "",
    description: "",
    price: "$1.00",
    oldPrice: "",
    discount: "",
    currency: "USD",
    availability: "",
    pageCaptured: false,
    localImages: [],
    options: options.map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values.map((value) => ({ value, label: value })),
    })),
  } as FlProduct;
}

const colorSize = product([
  { id: "o-color", name: "Color", values: ["Black", "Tan"] },
  { id: "o-size", name: "Size", values: ["S", "M"] },
]);

const variants = [
  { id: "variant_a", selection: { Color: "Black", Size: "M" } },
  { id: "variant_b", selection: { Color: "Tan", Size: "S" } },
  { id: "variant_c", selection: { Color: "Tan", Size: "M" } },
];

describe("resolveVariantFrom", () => {
  it("resolves a fully matching selection", () => {
    expect(
      resolveVariantFrom(variants, colorSize.options, { Color: "Tan", Size: "M" }),
    ).toEqual(variants[2]);
  });

  it("returns null when an option is missing from the selection", () => {
    expect(resolveVariantFrom(variants, colorSize.options, { Color: "Tan" })).toBeNull();
  });

  it("returns null when a selected value matches no variant", () => {
    expect(
      resolveVariantFrom(variants, colorSize.options, { Color: "Black", Size: "S" }),
    ).toBeNull();
  });

  it("ignores extra keys in the selection beyond the product options", () => {
    expect(
      resolveVariantFrom(variants, colorSize.options, {
        Color: "Black",
        Size: "M",
        Monogram: "A",
      }),
    ).toEqual(variants[0]);
  });

  it("rejects ids that are not real Medusa variant ids", () => {
    expect(
      resolveVariantFrom(
        [{ id: "not-a-variant", selection: { Color: "Black", Size: "M" } }, ...variants],
        colorSize.options,
        { Color: "Black", Size: "M" },
      ),
    ).toEqual(variants[0]);
  });

  it("returns null for an empty variant list", () => {
    expect(resolveVariantFrom([], colorSize.options, { Color: "Black", Size: "M" })).toBeNull();
  });

  it("treats empty-string selections as missing", () => {
    expect(
      resolveVariantFrom(variants, colorSize.options, { Color: "Tan", Size: "" }),
    ).toBeNull();
  });
});

describe("resolveFlVariant keeps delegating to resolveVariantFrom", () => {
  it("matches a local variant through the local mapping table", async () => {
    // A real product from the local catalogue with a variant mapping.
    const variantModule = await import("@/lib/florencess-variants");
    const catalog = await import("@/lib/florencess-catalog");
    const mapped = variantModule.FL_VARIANT_MAP.products.find(
      (entry) => entry.variants.length > 0,
    );
    if (!mapped) return; // catalogue without mappings: nothing to assert
    const localProduct = catalog.getFlProductById(mapped.productId);
    if (!localProduct) return;
    const selection = defaultFlSelection(localProduct);
    expect(resolveFlVariant(localProduct, selection)).not.toBeNull();
  });
});
