/**
 * Medusa variant mapping for catalogue products.
 *
 * The catalogue is display data captured from the reference. Trading amounts,
 * stock and option availability come from Medusa, so a product can only be
 * added to the cart when a variant mapping exists AND the visitor's selection
 * resolves to one concrete variant. Until such a mapping is imported every
 * product renders an explicit "not yet available" purchase state — the slug is
 * never used as a variant id and no stock is invented.
 */
import mappingJson from "@/data/florencess-variant-map.json";
import type { FlProduct } from "./florencess-catalog";

export type FlVariant = {
  /** Real Medusa variant id. */
  id: string;
  /** Option value label per option name, e.g. { Color: "Black" }. */
  selection: Record<string, string>;
};

export type FlVariantMapping = {
  productId: string;
  medusaProductId: string;
  variants: FlVariant[];
};

type FlVariantMapFile = {
  generatedAt: string;
  source: string;
  products: FlVariantMapping[];
};

export const FL_VARIANT_MAP = mappingJson as unknown as FlVariantMapFile;

const mappingByProductId = new Map<string, FlVariantMapping>();
for (const mapping of FL_VARIANT_MAP.products) {
  mappingByProductId.set(mapping.productId, mapping);
}

export function getFlVariantMapping(productId: string): FlVariantMapping | undefined {
  return mappingByProductId.get(productId);
}

/** Selection defaults to the first value of every option (reference default). */
export function defaultFlSelection(product: FlProduct): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const option of product.options) {
    const [first] = option.values;
    if (first) selection[option.name] = first.label;
  }
  return selection;
}

export function resolveFlVariant(
  product: FlProduct,
  selection: Record<string, string>,
): FlVariant | null {
  const mapping = mappingByProductId.get(product.id);
  if (!mapping) return null;
  const optionNames = product.options.map((option) => option.name);
  const match = mapping.variants.find((variant) =>
    variant.id.startsWith("variant_") &&
    Object.keys(variant.selection).length === optionNames.length &&
    optionNames.every(
      (name) =>
        typeof selection[name] === "string" &&
        selection[name].length > 0 &&
        variant.selection[name] === selection[name],
    ),
  );
  return match ?? null;
}

/** True when at least one concrete variant exists for the product. */
export function flProductHasVariants(product: FlProduct): boolean {
  return (mappingByProductId.get(product.id)?.variants.length ?? 0) > 0;
}
