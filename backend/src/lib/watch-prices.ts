// Medusa v2 stores amounts in major currency units. These are the owner's
// approved prices and the seed's fixed conversion rates, not live FX.
export const watchSizes = ["32mm", "36mm", "38mm", "40mm", "42mm"] as const
export const strapOptions = ["Leather Strap", "Canvas Strap", "Steel Bracelet", "Mesh Bracelet"] as const
export const dialOptions = ["Black", "White", "Blue"] as const

export const sizeBasePrices: Record<string, number> = {
  "32mm": 229, "36mm": 249, "38mm": 279, "40mm": 309, "42mm": 339,
}

/** Per-model option sets: not every permutation is a sellable SKU. */
export const modelOptionSets: Record<string, { sizes: readonly string[]; straps: readonly string[] }> = {
  "heritage-classic-40": { sizes: ["38mm", "40mm", "42mm"], straps: ["Leather Strap", "Mesh Bracelet"] },
  "meridian-automatic": { sizes: ["38mm", "40mm", "42mm"], straps: ["Leather Strap", "Steel Bracelet", "Mesh Bracelet"] },
  "regent-chronograph": { sizes: ["40mm", "42mm"], straps: ["Leather Strap", "Steel Bracelet"] },
  "averly-dress-watch": { sizes: ["32mm", "36mm", "38mm"], straps: ["Leather Strap", "Mesh Bracelet"] },
  "northsea-diver": { sizes: ["40mm", "42mm"], straps: ["Steel Bracelet", "Leather Strap"] },
  "lucienne-slim-32": { sizes: ["32mm", "36mm"], straps: ["Leather Strap", "Mesh Bracelet"] },
  "ellery-everyday": { sizes: ["36mm", "38mm", "40mm"], straps: ["Leather Strap", "Steel Bracelet", "Mesh Bracelet"] },
  "field-pine-safari": { sizes: ["38mm", "40mm", "42mm"], straps: ["Canvas Strap", "Leather Strap"] },
}

export const seededWatches = {
  "heritage-classic-40": { skuPrefix: "CAN-HERITAGE", offset: 0, engraveable: true },
  "meridian-automatic": { skuPrefix: "CAN-MERIDIAN", offset: 120, engraveable: true },
  "regent-chronograph": { skuPrefix: "CAN-REGENT", offset: 90, engraveable: true },
  "averly-dress-watch": { skuPrefix: "CAN-AVERLY", offset: -30, engraveable: true },
  "northsea-diver": { skuPrefix: "CAN-NORTHSEA", offset: 60, engraveable: true },
  "lucienne-slim-32": { skuPrefix: "CAN-LUCIENNE", offset: -10, engraveable: true },
  "ellery-everyday": { skuPrefix: "CAN-ELLERY", offset: -40, engraveable: false },
  "field-pine-safari": { skuPrefix: "CAN-FIELD", offset: -20, engraveable: false },
} as const

export const deliveryPrices: Record<string, Record<string, number>> = {
  "Standard Watch Delivery": { gbp: 9, eur: 11, usd: 14 },
  "Priority Watch Delivery": { gbp: 18, eur: 22, usd: 28 },
  "Free Watch Delivery": { gbp: 0, eur: 0, usd: 0 },
}

export function watchUsdPrice(size: string, strap: string, offset = 0) {
  if (!watchSizes.includes(size as any) || !strapOptions.includes(strap as any) ||
      !Number.isFinite(offset)) {
    throw new Error("Unknown watch pricing options")
  }
  return sizeBasePrices[size] + (strap === "Steel Bracelet" ? 60 : strap === "Mesh Bracelet" ? 40 : 0) + offset
}

export function watchPrices(amountUsd: number) {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) throw new Error("Invalid USD amount")
  const cents = Math.round((amountUsd + Number.EPSILON) * 100)
  return [
    { amount: Math.round(cents * 78 / 100) / 100, currency_code: "gbp" },
    { amount: Math.round(cents * 92 / 100) / 100, currency_code: "eur" },
    { amount: cents / 100, currency_code: "usd" },
  ]
}

export function sampleUsdPrice(random = Math.random()) {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error("Invalid random sample")
  return (Math.floor(random * 25001) + 24900) / 100
}

export function shippingPrice(name: string, currency: string) {
  const amount = deliveryPrices[name]?.[currency]
  if (amount === undefined) throw new Error("Unknown delivery price")
  return amount
}

export function watchSku(prefix: string, size: string, strap: string, dial: string) {
  const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  return `${prefix}-${slug(size)}-${slug(strap)}-${slug(dial)}`
}
