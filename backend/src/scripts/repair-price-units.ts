import crypto from "node:crypto"
import fs from "node:fs/promises"
import net from "node:net"
import path from "node:path"
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { refreshCartItemsWorkflow, refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import { CartPriceSnapshot, cartProtectedData, planCartPriceRefresh } from "../lib/cart-price-repair"
import { buildPriceRepairPlan, CatalogPriceRow } from "../lib/price-unit-repair"

const { Client } = require("pg")
const root = path.resolve(__dirname, "../../..")
const auditDir = path.join(root, "audits/2026-10-09/02-prices")
const planFile = path.join(auditDir, "dry-run-plan.json")

// A catalog-only read: no order/customer records are included in this query.
const catalogSql = `
SELECT p.id, p.price_set_id, p.amount::text, p.raw_amount, p.currency_code,
       p.price_list_id, p.min_quantity::text, p.max_quantity::text, p.rules_count,
       CASE WHEN pv.id IS NOT NULL THEN 'product' ELSE 'shipping' END AS kind,
       prod.handle, pv.id AS variant_id, pv.sku, pv.metadata,
       COALESCE(opt.options, '{}'::jsonb) AS options, COALESCE(opt.option_count, 0)::int AS option_count,
       so.id AS shipping_option_id, so.name AS shipping_name,
       sot.code AS shipping_code, so.price_type, so.provider_id,
       COALESCE(rules.rules, '[]'::jsonb) AS rules
FROM price p
LEFT JOIN product_variant_price_set vpl ON vpl.price_set_id=p.price_set_id AND vpl.deleted_at IS NULL
LEFT JOIN product_variant pv ON pv.id=vpl.variant_id AND pv.deleted_at IS NULL
LEFT JOIN product prod ON prod.id=pv.product_id AND prod.deleted_at IS NULL
LEFT JOIN shipping_option_price_set spl ON spl.price_set_id=p.price_set_id AND spl.deleted_at IS NULL
LEFT JOIN shipping_option so ON so.id=spl.shipping_option_id AND so.deleted_at IS NULL
LEFT JOIN shipping_option_type sot ON sot.id=so.shipping_option_type_id AND sot.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT jsonb_object_agg(po.title, ov.value) AS options, count(*) AS option_count
  FROM product_variant_option vo
  JOIN product_option_value ov ON ov.id=vo.option_value_id AND ov.deleted_at IS NULL
  JOIN product_option po ON po.id=ov.option_id AND po.deleted_at IS NULL
  WHERE vo.variant_id=pv.id
) opt ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object('attribute', pr.attribute, 'value', pr.value,
    'operator', pr.operator, 'region_currency', r.currency_code, 'region_name', r.name)
    ORDER BY pr.id) AS rules
  FROM price_rule pr
  LEFT JOIN region r ON pr.attribute='region_id' AND r.id=pr.value AND r.deleted_at IS NULL
  WHERE pr.price_id=p.id AND pr.deleted_at IS NULL
) rules ON true
WHERE p.deleted_at IS NULL ORDER BY p.id, pv.id, so.id`

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    if (value instanceof Date) return JSON.stringify(value.toISOString())
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as any)[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

const hash = (value: unknown) => crypto.createHash("sha256").update(stableJson(value)).digest("hex")

async function requireStoppedLocalApi() {
  // A timeout, EACCES, reset, or HTTP failure is not evidence of a stopped API.
  for (const host of ["127.0.0.1", "::1"]) {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host, port: 9030 })
      socket.setTimeout(3000)
      socket.once("connect", () => {
        socket.destroy()
        reject(new Error("Stop the local H:/Cansoria backend API on port 9030 before apply; restore it after verification."))
      })
      socket.once("timeout", () => { socket.destroy(); reject(new Error(`Cannot prove API is stopped on ${host}: timeout`)) })
      socket.once("error", (error: NodeJS.ErrnoException) => {
        socket.destroy()
        if (error.code === "ECONNREFUSED") resolve()
        else reject(new Error(`Cannot prove API is stopped on ${host}: ${error.code}`))
      })
    })
  }
}

async function readCarts(client: any): Promise<CartPriceSnapshot[]> {
  const carts = (await client.query(`SELECT c.*, r.currency_code AS region_currency FROM cart c
    LEFT JOIN region r ON r.id=c.region_id WHERE c.deleted_at IS NULL AND c.completed_at IS NULL ORDER BY c.id`)).rows
  if (!carts.length) return []
  const ids = carts.map(cart => cart.id)
  const items = (await client.query("SELECT * FROM cart_line_item WHERE cart_id=ANY($1::text[]) AND deleted_at IS NULL ORDER BY id", [ids])).rows
  const shipping = (await client.query("SELECT * FROM cart_shipping_method WHERE cart_id=ANY($1::text[]) AND deleted_at IS NULL ORDER BY id", [ids])).rows
  const collections = (await client.query(`SELECT pc.*, link.cart_id FROM cart_payment_collection link
    JOIN payment_collection pc ON pc.id=link.payment_collection_id
    WHERE link.cart_id=ANY($1::text[]) AND link.deleted_at IS NULL AND pc.deleted_at IS NULL ORDER BY pc.id`, [ids])).rows
  const guards = (await client.query(`SELECT c.id,
    (SELECT count(*) FROM order_cart oc WHERE oc.cart_id=c.id)::int AS order_count,
    (SELECT count(*) FROM payment_session ps JOIN cart_payment_collection cp ON cp.payment_collection_id=ps.payment_collection_id WHERE cp.cart_id=c.id)::int AS session_count,
    (SELECT count(*) FROM payment p JOIN cart_payment_collection cp ON cp.payment_collection_id=p.payment_collection_id WHERE cp.cart_id=c.id)::int AS payment_count
    FROM cart c WHERE c.id=ANY($1::text[]) ORDER BY c.id`, [ids])).rows
  return carts.map(cart => ({
    cart, items: items.filter(item => item.cart_id === cart.id), shipping: shipping.filter(method => method.cart_id === cart.id),
    collections: collections.filter(collection => collection.cart_id === cart.id),
    ...guards.find(guard => guard.id === cart.id),
  }))
}

async function readState(client: any) {
  return { catalog: (await client.query(catalogSql)).rows as CatalogPriceRow[], carts: await readCarts(client) }
}

function summarize(state: Awaited<ReturnType<typeof readState>>) {
  const prices = buildPriceRepairPlan(state.catalog)
  const carts = state.carts.map(cart => planCartPriceRefresh(cart, state.catalog))
  return {
    fingerprint: hash(state),
    price_count: state.catalog.length, price_changes: prices.changes.length,
    already_correct: prices.already_correct, unmanaged: prices.unmanaged, rejected: prices.rejected,
    incomplete_carts: state.carts.length, carts_to_refresh: carts.filter(cart => cart.needs_refresh).length,
    old_cart_items: carts.reduce((count, cart) => count + cart.old_items, 0),
    old_cart_shipping: carts.reduce((count, cart) => count + cart.old_shipping, 0),
    collections_on_carts_to_refresh: state.carts.filter(cart => carts.find(plan => plan.cart_id === cart.cart.id)?.needs_refresh).reduce((count, cart) => count + cart.collections.length, 0),
    changes: prices.changes,
  }
}

async function writeJson(file: string, value: unknown, exclusive = false) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: exclusive ? "wx" : "w", mode: 0o600 })
}

/**
 * Local-only CLI. Dry-run is the default:
 *   npx medusa exec ./src/scripts/repair-price-units.ts
 * Stop port 9030, then use the freshly reviewed plan:
 *   npx medusa exec ./src/scripts/repair-price-units.ts apply
 * Restore the local API after verification. Never run the whole seed to repair prices.
 */
export default async function repairPriceUnits({ container, args = [] }: ExecArgs) {
  if (args.some(arg => arg !== "apply")) throw new Error("Only the optional 'apply' argument is supported")
  const apply = args.includes("apply")
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")
  const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "").toLowerCase()
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) throw new Error("This repair is authorized only for a local database")
  if (apply) await requireStoppedLocalApi()
  const client = new Client({ connectionString: databaseUrl })
  let backupDir: string | undefined
  let pricesCommitted = false
  const refreshed: string[] = []
  await client.connect()
  try {
    const lock = (await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS acquired", ["cansoria-price-unit-repair-02"])).rows[0].acquired
    if (!lock) throw new Error("Another price-unit repair is running")
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const initial = await readState(client)
    const summary = summarize(initial)
    await client.query("ROLLBACK")
    if (summary.rejected.length) throw new Error(`Refusing ${summary.rejected.length} modified/unknown managed prices; inspect the dry-run plan`)
    if (!apply) {
      await writeJson(planFile, { mode: "dry-run", approved_prices: "2026-10-09 owner confirmation", ...summary })
      console.log(JSON.stringify({ ...summary, changes: undefined, plan_file: path.relative(root, planFile) }))
      return
    }
    const reviewed = JSON.parse(await fs.readFile(planFile, "utf8"))
    if (reviewed.mode !== "dry-run" || reviewed.fingerprint !== summary.fingerprint) throw new Error("Database changed since dry-run; regenerate and review the plan before apply")
    if (!summary.price_changes && !summary.carts_to_refresh) {
      console.log(JSON.stringify({ mode: "apply", result: "already corrected; no changes", ...summary, changes: undefined }))
      return
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    backupDir = path.join(root, ".local-backups/2026-10-09/02-prices", stamp)
    // The private snapshot contains cart metadata/photo records. Do not copy it to audits or Git.
    await writeJson(path.join(backupDir, "before.json"), { catalog: initial.catalog, carts: initial.carts, fingerprint: summary.fingerprint }, true)
    await writeJson(path.join(backupDir, "progress.json"), { phase: "before-price-write", refreshed: [] }, true)
    await requireStoppedLocalApi()
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE")
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query(`LOCK TABLE price, price_rule, product, product_variant, product_variant_price_set,
      product_option, product_option_value, product_variant_option, shipping_option,
      shipping_option_price_set, shipping_option_type, region IN SHARE MODE`)
    const lockedState = await readState(client)
    if (hash(lockedState) !== summary.fingerprint) throw new Error("Catalog/rules/options/cart state changed before price write")
    for (const change of summary.changes) {
      const raw = { ...change.raw_before, value: String(change.after) }
      const result = await client.query(`UPDATE price SET amount=$1::numeric, raw_amount=$2::jsonb, updated_at=now()
        WHERE id=$3 AND deleted_at IS NULL AND amount=$4::numeric AND raw_amount=$5::jsonb`,
      [String(change.after), JSON.stringify(raw), change.id, String(change.before), JSON.stringify(change.raw_before)])
      if (result.rowCount !== 1) throw new Error("Price changed concurrently; transaction must roll back")
    }
    const written = buildPriceRepairPlan((await client.query(catalogSql)).rows)
    if (written.changes.length || written.rejected.length) throw new Error("Post-write price verification failed")
    await client.query("COMMIT")
    pricesCommitted = true
    await writeJson(path.join(backupDir, "progress.json"), { phase: "prices-committed", refreshed })
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    for (const before of initial.carts) {
      if (!planCartPriceRefresh(before, initial.catalog).needs_refresh) continue
      await requireStoppedLocalApi()
      const current = (await readCarts(client)).find(cart => cart.cart.id === before.cart.id)
      if (!current || hash(current) !== hash(before)) throw new Error("Cart changed since backup; refusing refresh")
      planCartPriceRefresh(current, initial.catalog) // Recheck sessions, payment, order, and exact amounts.
      await refreshCartItemsWorkflow(container).run({ input: { cart_id: before.cart.id, force_refresh: true } })
      // Refetch final totals after shipping, taxes and promotions, not a pre-refresh cart snapshot.
      await refreshPaymentCollectionForCartWorkflow(container).run({ input: { cart_id: before.cart.id } })
      const after = (await readCarts(client)).find(cart => cart.cart.id === before.cart.id)
      if (!after || stableJson(cartProtectedData(after)) !== stableJson(cartProtectedData(before))) throw new Error("Cart IDs, quantity, metadata or shipping references changed; keep API stopped and inspect private backup")
      if (planCartPriceRefresh(after, (await client.query(catalogSql)).rows).needs_refresh) throw new Error("Old cart units remain after refresh")
      const { data } = await query.graph({ entity: "cart", fields: ["id", "total", "payment_collection.id", "payment_collection.amount"], filters: { id: before.cart.id } })
      const cart = data[0]
      if (after.collections.length && (!cart?.payment_collection || Number(cart.payment_collection.amount) !== Number(cart.total))) throw new Error("Payment collection amount differs from final cart total")
      refreshed.push(before.cart.id)
      await writeJson(path.join(backupDir, "progress.json"), { phase: "refreshing-carts", refreshed })
    }
    const final = await readState(client)
    const finalSummary = summarize(final)
    if (finalSummary.price_changes || finalSummary.old_cart_items || finalSummary.old_cart_shipping) throw new Error("Final old-unit verification failed")
    for (const before of initial.carts) {
      const after = final.carts.find(cart => cart.cart.id === before.cart.id)
      if (!after || stableJson(cartProtectedData(before)) !== stableJson(cartProtectedData(after))) throw new Error("Final protected cart data verification failed")
    }
    await writeJson(path.join(backupDir, "after.json"), final, true)
    await writeJson(path.join(backupDir, "progress.json"), { phase: "complete", refreshed })
    await writeJson(path.join(auditDir, "execution-summary.json"), {
      before: { ...summary, changes: undefined }, after: { ...finalSummary, changes: undefined },
      prices_updated: summary.price_changes, carts_refreshed: refreshed.length,
      protected_cart_data_unchanged: true, all_refreshed_collections_match_cart_total: true,
      private_backup: path.relative(root, backupDir),
    })
    console.log(JSON.stringify({ result: "complete", prices_updated: summary.price_changes, carts_refreshed: refreshed.length,
      old_cart_items: finalSummary.old_cart_items, old_cart_shipping: finalSummary.old_cart_shipping, private_backup: path.relative(root, backupDir) }))
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    if (backupDir) await writeJson(path.join(backupDir, "progress.json"), { phase: "failed", prices_committed: pricesCommitted, refreshed, error: (error as Error).message })
    throw new Error(`${(error as Error).message}${backupDir ? `; recovery snapshot: ${path.relative(root, backupDir)}. Keep port 9030 stopped until recovery/verification.` : ""}`)
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", ["cansoria-price-unit-repair-02"]).catch(() => {})
    await client.end()
  }
}
