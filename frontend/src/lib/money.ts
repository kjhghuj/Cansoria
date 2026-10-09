import type { StoreProduct } from "./types";

// Medusa v2 returns major currency units; Stripe converts these on the server.
export function formatPrice(
  amount: number | null | undefined,
  currencyCode = "GBP",
) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "N/A";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount);
}

export function lowestProductPrice(
  product: Pick<StoreProduct, "variants">,
  currencyCode?: string,
) {
  const amounts =
    product.variants?.flatMap((variant) => {
      const price = variant.calculated_price;
      if (
        currencyCode &&
        price?.currency_code?.toLowerCase() !== currencyCode.toLowerCase()
      )
        return [];
      const amount = price?.calculated_amount;
      return typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount >= 0
        ? [amount]
        : [];
    }) ?? [];
  return amounts.length ? Math.min(...amounts) : undefined;
}

export function toMinorUnits(amount: number, currencyCode: string) {
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  return Math.round(amount * 10 ** digits);
}
