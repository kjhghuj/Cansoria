import { watchPrices, watchSku, watchUsdPrice, deliveryPrices, seededWatches, shippingPrice } from "./watch-prices"

export type PriceRule = {
  attribute: string; value: string; operator: string
  region_currency?: string; region_name?: string
}

export type CatalogPriceRow = {
  id: string; price_set_id: string; amount: string | number
  raw_amount: { value: string | number; precision: number }
  currency_code: string; price_list_id: string | null
  min_quantity: string | null; max_quantity: string | null
  rules_count: number; rules: PriceRule[]; kind: "product" | "shipping"
  handle?: string; sku?: string; options?: Record<string, string>; option_count?: number
  metadata?: Record<string, unknown>
  shipping_name?: string; shipping_code?: string; price_type?: string; provider_id?: string
}

export type PriceChange = {
  id: string; price_set_id: string; currency: string; kind: string; label: string
  before: number; after: number; raw_before: CatalogPriceRow["raw_amount"]
}

export function expectedCatalogAmount(row: CatalogPriceRow): number | undefined {
  if (row.kind === "product") {
    const product = seededWatches[row.handle as keyof typeof seededWatches]
    if (!product) return undefined
    const { Size: size, Strap: strap, Dial: dial } = row.options || {}
    if (row.option_count !== 3 || row.metadata?.size !== size || row.metadata?.strap !== strap ||
        row.metadata?.dial !== dial) throw new Error("Options and metadata do not match the seed")
    const usd = watchUsdPrice(size, strap, product.offset)
    if (row.sku !== watchSku(product.skuPrefix, size, strap, dial)) throw new Error("SKU does not match the seed")
    if (row.rules.length || row.rules_count !== 0) throw new Error("Custom product price rules")
    const amount = watchPrices(usd).find(price => price.currency_code === row.currency_code)?.amount
    if (amount === undefined) throw new Error("Unsupported currency")
    return amount
  }

  if (!deliveryPrices[row.shipping_name || ""]) return undefined
  const code = { "Standard Watch Delivery": "standard-watch-delivery", "Priority Watch Delivery": "priority-watch-delivery", "Free Watch Delivery": "free-watch-delivery" }[row.shipping_name!]
  if (row.shipping_code !== code || row.price_type !== "flat" || row.provider_id !== "manual_manual") {
    throw new Error("Shipping identity does not match the seed")
  }
  if (row.rules_count !== row.rules.length || row.rules.length > 1) throw new Error("Custom shipping price rules")
  if (row.rules.length) {
    const rule = row.rules[0]
    const regionName = { gbp: "United Kingdom", usd: "United States", eur: "Europe" }[row.currency_code]
    if (rule.attribute !== "region_id" || rule.operator !== "eq" ||
        rule.region_currency !== row.currency_code || rule.region_name !== regionName) {
      throw new Error("Shipping region rule does not match the seed")
    }
  }
  return shippingPrice(row.shipping_name!, row.currency_code)
}

export function buildPriceRepairPlan(rows: CatalogPriceRow[]) {
  const changes: PriceChange[] = []
  const rejected: { id: string; reason: string }[] = []
  let already_correct = 0
  let unmanaged = 0
  const seen = new Set<string>()

  for (const row of rows) {
    if (seen.has(row.id)) {
      rejected.push({ id: row.id, reason: "Duplicate/shared price ID" })
      continue
    }
    seen.add(row.id)
    try {
      const expected = expectedCatalogAmount(row)
      if (expected === undefined) { unmanaged++; continue }
      if (row.price_list_id !== null || row.min_quantity !== null || row.max_quantity !== null) {
        throw new Error("Custom price list or quantity limits")
      }
      const before = Number(row.amount)
      if (!Number.isFinite(before) || !row.raw_amount || Number(row.raw_amount.value) !== before ||
          !Number.isInteger(row.raw_amount.precision)) throw new Error("Inconsistent amount/raw_amount")
      if (before === expected) { already_correct++; continue }
      const legacy = Math.round(expected * 100)
      if (before !== legacy) throw new Error("Amount is neither the exact legacy seed price nor the approved major-unit price")
      changes.push({
        id: row.id, price_set_id: row.price_set_id, currency: row.currency_code,
        kind: row.kind, label: row.sku || row.shipping_name || "", before, after: expected,
        raw_before: row.raw_amount,
      })
    } catch (error) {
      rejected.push({ id: row.id, reason: (error as Error).message })
    }
  }
  return { changes, already_correct, unmanaged, rejected }
}
