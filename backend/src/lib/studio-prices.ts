// Medusa v2 stores amounts in major currency units. These are the owner's
// approved prices and the existing seed's fixed conversion rates, not live FX.
export const artworkSizes = ["8x10", "12x16", "16x20", "24x36"] as const
export const framingOptions = ["Canvas Only", "Framed"] as const
export const orientations = ["Portrait", "Landscape", "Square"] as const

export const sizeBasePrices: Record<string, number> = {
  "8x10": 129, "12x16": 189, "16x20": 259, "24x36": 399,
}

export const seededArtwork = {
  "custom-portrait-from-photo": { skuPrefix: "CAN-PORTRAIT", offset: 0 },
  "pet-portrait-oil-painting": { skuPrefix: "CAN-PET", offset: -20 },
  "wedding-anniversary-oil-portrait": { skuPrefix: "CAN-WEDDING", offset: 15 },
  "landscape-oil-painting": { skuPrefix: "CAN-LANDSCAPE", offset: -10 },
  "abstract-canvas-wall-art": { skuPrefix: "CAN-ABSTRACT", offset: -5 },
  "classic-art-reproduction": { skuPrefix: "CAN-CLASSIC", offset: 25 },
  "home-decor-canvas-painting": { skuPrefix: "CAN-HOME", offset: -15 },
} as const

export const deliveryPrices: Record<string, Record<string, number>> = {
  "Standard Art Delivery": { gbp: 9, eur: 11, usd: 14 },
  "Priority Art Delivery": { gbp: 18, eur: 22, usd: 28 },
  "Free Art Delivery": { gbp: 0, eur: 0, usd: 0 },
}

export function artworkUsdPrice(size: string, framing: string, orientation: string, offset = 0) {
  if (!artworkSizes.includes(size as any) || !framingOptions.includes(framing as any) ||
      !orientations.includes(orientation as any) || !Number.isFinite(offset)) {
    throw new Error("Unknown artwork pricing options")
  }
  return sizeBasePrices[size] + (framing === "Framed" ? 70 : 0) +
    (orientation === "Square" ? 15 : 0) + offset
}

export function artworkPrices(amountUsd: number) {
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
  return (Math.floor(random * 18001) + 12900) / 100
}

export function shippingPrice(name: string, currency: string) {
  const amount = deliveryPrices[name]?.[currency]
  if (amount === undefined) throw new Error("Unknown delivery price")
  return amount
}

export function artworkSku(prefix: string, size: string, framing: string, orientation: string) {
  const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  return `${prefix}-${slug(size)}-${slug(framing)}-${slug(orientation)}`
}
