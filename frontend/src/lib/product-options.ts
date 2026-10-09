import type { StoreProduct, StoreProductVariant } from "./types";

export function findSelectedVariant(
  product: Pick<StoreProduct, "variants" | "options">,
  selectedOptions: Record<string, string>,
): StoreProductVariant | null {
  const variants = product.variants ?? [];
  const options = product.options ?? [];
  if (!variants.length) return null;
  if (!options.length) return variants[0];
  if (options.some((option) => !selectedOptions[option.id])) return null;
  return (
    variants.find((variant) =>
      options.every((option) =>
        variant.options?.some(
          (value) =>
            value.option_id === option.id &&
            value.value === selectedOptions[option.id],
        ),
      ),
    ) ?? null
  );
}
