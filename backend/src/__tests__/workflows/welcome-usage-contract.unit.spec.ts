import PromotionModule from "@medusajs/medusa/promotion"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { createMedusaContainer, MathBN, MedusaError } from "@medusajs/framework/utils"
import { asValue } from "@medusajs/framework/awilix"
import type { BigNumberInput, Context, UsageComputedActions } from "@medusajs/framework/types"

const NativePromotionService = PromotionModule.service!
type Dependencies = ConstructorParameters<typeof NativePromotionService>[0]

type PromotionFixture = {
  id: string
  code: string
  status: string
  limit: number | null
  used: number
  campaign_id: string | null
  campaign: null | {
    id: string
    starts_at: Date | null
    ends_at: Date | null
    budget: { id: string; type: string; limit: number; used: number }
  }
}
type Transaction = {
  id: number
  getTransactionContext: () => ReturnType<typeof makeKnex>
  cache: Map<string, PromotionFixture>
  budgets: Map<string, number>
  promotions: Map<string, number>
  releases: (() => void)[]
}
type Trace = { tx: number; event: string; [key: string]: unknown }

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => { resolve = done })
  return { promise, resolve }
}

function fixture(overrides: Partial<PromotionFixture> = {}): PromotionFixture {
  return {
    id: "promo_welcome", code: "ART15-CONTRACT", status: "active", limit: 1, used: 0,
    campaign_id: "campaign_welcome",
    campaign: {
      id: "campaign_welcome", starts_at: null, ends_at: null,
      budget: { id: "budget_welcome", type: "usage", limit: 1, used: 0 },
    },
    ...overrides,
  }
}

// A small repository query interpreter; it evaluates the native service's query,
// rather than reimplementing its active-promotion or usage algorithms.
function matches(value: unknown, query: unknown): boolean {
  if (query === null || typeof query !== "object" || query instanceof Date) return value === query
  if (Array.isArray(query)) return query.includes(value)
  const record = query as Record<string, unknown>
  return Object.entries(record).every(([key, expected]) => {
    if (key === "$and") return (expected as unknown[]).every((part) => matches(value, part))
    if (key === "$or") return (expected as unknown[]).some((part) => matches(value, part))
    if (key === "$lte") return Number(value) <= Number(expected)
    if (key === "$gt") return Number(value) > Number(expected)
    return matches((value as Record<string, unknown> | null)?.[key], expected)
  })
}

function makeKnex(tx: Transaction, traces: Trace[], acquire: (tx: Transaction, key: string) => Promise<void>) {
  const knex = (table: string) => {
    let ids: string[] = [], order: string | undefined, update = false
    const builder = {
      whereIn: (column: string, values: string[]) => { expect(column).toBe("id"); ids = values; return builder },
      orderBy: (column: string) => { order = column; return builder },
      forUpdate: () => { update = true; return builder },
      select: async (column: string) => {
        traces.push({ tx: tx.id, event: "select", table, ids: [...ids], order, forUpdate: update, column })
        if (update) {
          const orderedIds = order === "id" ? [...ids].sort() : ids
          for (const id of orderedIds) await acquire(tx, `${table}:${id}`)
        }
        return ids.map((id) => ({ id }))
      },
    }
    return builder
  }
  knex.raw = async (sql: string) => { traces.push({ tx: tx.id, event: "raw", sql }) }
  return knex
}

function nativeHarness(rows: PromotionFixture[] = [fixture()], initialReaders = 0) {
  const traces: Trace[] = []
  const held = new Map<string, { owner: number; latch: ReturnType<typeof deferred> }>()
  const barrier = deferred()
  let txSequence = 0, readers = 0
  let beforeCommit: ((tx: Transaction) => Promise<void>) | undefined
  let onLockWait: ((tx: Transaction) => void) | undefined
  const transactions = new Map<number, Transaction>()
  const acquire = async (tx: Transaction, key: string) => {
    if (held.get(key)?.owner === tx.id) return
    while (held.has(key)) {
      traces.push({ tx: tx.id, event: "lock-wait", key })
      onLockWait?.(tx)
      await held.get(key)!.latch.promise
    }
    const latch = deferred()
    held.set(key, { owner: tx.id, latch })
    traces.push({ tx: tx.id, event: "lock-held", key })
    tx.releases.push(() => { held.delete(key); latch.resolve() })
  }
  const getTx = (context: Context): Transaction => context.transactionManager as Transaction
  const transaction = jest.fn(async (task: (tx: Transaction) => Promise<unknown>) => {
    const tx: Transaction = {
      id: ++txSequence, cache: new Map(), budgets: new Map(), promotions: new Map(), releases: [],
      getTransactionContext: () => makeKnex(tx, traces, acquire),
    }
    transactions.set(tx.id, tx)
    traces.push({ tx: tx.id, event: "begin" })
    try {
      const result = await task(tx)
      await beforeCommit?.(tx)
      for (const row of rows) {
        if (tx.promotions.has(row.id)) row.used = tx.promotions.get(row.id)!
        const budget = row.campaign?.budget
        if (budget && tx.budgets.has(budget.id)) budget.used = tx.budgets.get(budget.id)!
      }
      traces.push({ tx: tx.id, event: "commit" })
      return result
    } catch (error) {
      traces.push({ tx: tx.id, event: "rollback" })
      throw error
    } finally {
      tx.releases.forEach((release) => release())
    }
  })
  const list = jest.fn(async (query: unknown, config: { options?: { refresh?: boolean } }, context: Context) => {
    const tx = getTx(context)
    traces.push({ tx: tx.id, event: "read", refresh: config.options?.refresh === true })
    const result = rows.filter((row) => matches(row, query)).map((row) => {
      if (!tx.cache.has(row.id) || config.options?.refresh) tx.cache.set(row.id, structuredClone(row))
      return structuredClone(tx.cache.get(row.id)!)
    })
    if (!config.options?.refresh && initialReaders && ++readers <= initialReaders) {
      if (readers === initialReaders) barrier.resolve()
      await barrier.promise
    }
    return result
  })
  const updatePromotions = jest.fn(async (updates: { id: string; used: number }[], context: Context) => {
    const tx = getTx(context)
    // PostgreSQL UPDATE takes an implicit row lock, even though revertUsage has
    // no explicit FOR UPDATE before its read. This is still a lock simulation.
    for (const update of updates) {
      await acquire(tx, `promotion:${update.id}`)
      tx.promotions.set(update.id, update.used)
    }
    traces.push({ tx: tx.id, event: "update-promotion" })
  })
  const updateBudgets = jest.fn(async (updates: { id: string; used: BigNumberInput }[], context: Context) => {
    const tx = getTx(context)
    for (const update of updates) {
      await acquire(tx, `promotion_campaign_budget:${update.id}`)
      tx.budgets.set(update.id, MathBN.convert(update.used).toNumber())
    }
    traces.push({ tx: tx.id, event: "update-budget" })
  })
  // Only repositories/internal services are replaced. The instantiated public
  // module class, its transaction decorator, registerUsage and revertUsage remain real.
  const dependencies = {
    baseRepository: { transaction, getFreshManager: () => ({}), serialize: async (data: unknown) => data },
    promotionService: { list, update: updatePromotions },
    campaignBudgetService: { update: updateBudgets },
    applicationMethodService: {}, promotionRuleService: {}, promotionRuleValueService: {},
    campaignService: {}, campaignBudgetUsageService: {},
  } as unknown as Dependencies
  const service = new NativePromotionService(dependencies, { scope: "internal" })
  const register = jest.spyOn(service, "registerUsage")
  const revert = jest.spyOn(service, "revertUsage")
  return {
    service, rows, traces, transaction, list, updateBudgets, updatePromotions, register, revert, transactions,
    pauseBeforeCommit: (handler: (tx: Transaction) => Promise<void>) => { beforeCommit = handler },
    observeLockWait: (handler: (tx: Transaction) => void) => { onLockWait = handler },
  }
}

const actions: UsageComputedActions[] = [{ code: "ART15-CONTRACT", amount: 15 }]
const registration = { customer_id: "cus_contract", customer_email: "contract@example.test" }

describe("installed Medusa promotion usage contract (repository and row locks simulated)", () => {
  it("rejects one of two carts after a locked fresh read of a one-use budget", async () => {
    const h = nativeHarness([fixture({ limit: null })], 2)
    const results = await Promise.allSettled([
      h.service.registerUsage(actions, registration), h.service.registerUsage(actions, registration),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult
    expect(rejected.reason.message).toMatch(/exceeds the budget limit/)
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.revert).not.toHaveBeenCalled()
    expect(h.updateBudgets).toHaveBeenCalledTimes(1)
    expect(h.transaction).toHaveBeenCalledTimes(2)
    expect(h.traces.filter((event) => event.event === "lock-wait")).not.toHaveLength(0)
    expect(h.traces.filter((event) => event.event === "read").map((event) => event.refresh)).toEqual([false, false, true, true])
    for (const tx of [1, 2]) {
      const events = h.traces.filter((event) => event.tx === tx)
      expect(events.find((event) => event.event === "raw")?.sql).toBe("SET LOCAL lock_timeout = '3s'")
      expect(events.find((event) => event.event === "select")).toMatchObject({
        table: "promotion_campaign_budget", ids: ["budget_welcome"], order: "id", forUpdate: true, column: "id",
      })
      expect(events.findIndex((event) => event.event === "lock-held")).toBeLessThan(events.findIndex((event) => event.event === "read" && event.refresh))
    }
  })

  it("rejects missing transaction context instead of registering in autocommit", async () => {
    const h = nativeHarness()
    const cache = new Map()
    await expect(h.service.registerUsage(actions, registration, {
      transactionManager: { id: 9, cache, getTransactionContext: () => undefined },
    })).rejects.toThrow(/must run inside a transaction/)
    expect(h.transaction).not.toHaveBeenCalled()
    expect(h.updateBudgets).not.toHaveBeenCalled()
  })

  it("locks promotions and budgets in stable ID order within its injected transaction", async () => {
    const a = fixture({ id: "promo_z", code: "ART15-Z" })
    const b = fixture({ id: "promo_a", code: "ART15-A", campaign: {
      id: "campaign_a", starts_at: null, ends_at: null,
      budget: { id: "budget_a", type: "usage", limit: 1, used: 0 },
    } })
    const h = nativeHarness([a, b])
    await h.service.registerUsage([{ code: a.code, amount: 1 }, { code: b.code, amount: 1 }], registration)
    expect(h.traces.filter((event) => event.event === "select")).toMatchObject([
      { table: "promotion", ids: ["promo_z", "promo_a"], order: "id", forUpdate: true },
      { table: "promotion_campaign_budget", ids: ["budget_welcome", "budget_a"], order: "id", forUpdate: true },
    ])
    expect(h.traces.filter((event) => event.event === "lock-held").map((event) => event.key)).toEqual([
      "promotion:promo_a", "promotion:promo_z", "promotion_campaign_budget:budget_a", "promotion_campaign_budget:budget_welcome",
    ])
    expect(h.traces[h.traces.length - 1]?.event).toBe("commit")
  })

  it("uses one injected transaction and rolls back staged writes when a repository update fails", async () => {
    const h = nativeHarness()
    h.updateBudgets.mockRejectedValueOnce(new Error("isolated budget repository failure"))
    await expect(h.service.registerUsage(actions, registration)).rejects.toThrow("isolated budget repository failure")
    expect(h.updatePromotions).toHaveBeenCalledTimes(1)
    expect(h.updateBudgets).toHaveBeenCalledTimes(1)
    expect(h.updatePromotions.mock.calls[0][1].transactionManager).toBe(h.updateBudgets.mock.calls[0][1].transactionManager)
    expect(h.rows[0].used).toBe(0)
    expect(h.rows[0].campaign!.budget.used).toBe(0)
    expect(h.traces[h.traces.length - 1]?.event).toBe("rollback")
  })

  it("counts repeated adjustments for the same code once, and a real revert releases it", async () => {
    const h = nativeHarness()
    const repeated = [...actions, ...actions, ...actions]
    await h.service.registerUsage(repeated, registration)
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.rows[0].used).toBe(1)
    await h.service.revertUsage(repeated, registration)
    expect(h.rows[0].campaign!.budget.used).toBe(0)
    expect(h.rows[0].used).toBe(0)
    await h.service.registerUsage(actions, registration)
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.register).toHaveBeenCalledTimes(2)
    expect(h.revert).toHaveBeenCalledTimes(1)
    const compensationTx = h.traces.filter((event) => event.tx === 2)
    expect(compensationTx.filter((event) => event.event === "select")).toHaveLength(0)
    expect(compensationTx.find((event) => event.event === "read")?.refresh).toBe(false)
  })

  it("uses active status, inclusive start and exclusive end when selecting usage candidates", async () => {
    const h = nativeHarness()
    await h.service.registerUsage(actions, registration)
    const query = h.list.mock.calls[0][0] as {
      status: string; $or: [{ campaign_id: null }, { campaign: { $and: [{ $or: [{ starts_at: null }, { starts_at: { $lte: Date } }] }, { $or: [{ ends_at: null }, { ends_at: { $gt: Date } }] }] } }]
    }
    expect(query.status).toBe("active")
    const conditions = query.$or[1].campaign.$and
    const now = conditions[0].$or[1].starts_at.$lte
    expect(now).toBeInstanceOf(Date)
    expect(conditions[1].$or[1].ends_at.$gt).toBe(now)
    const atStart = fixture({ campaign: { ...fixture().campaign!, starts_at: now } })
    const atEnd = fixture({ campaign: { ...fixture().campaign!, ends_at: now } })
    expect(matches(atStart, query)).toBe(true)
    expect(matches(atEnd, query)).toBe(false)
    expect(matches(fixture({ status: "inactive" }), query)).toBe(false)
    expect(matches(fixture({ campaign: { ...fixture().campaign!, starts_at: new Date(+now + 1) } }), query)).toBe(false)
    expect(matches(fixture({ campaign: null, campaign_id: null }), query)).toBe(true)
  })

  it("silently omits inactive codes during both registration and revert, requiring the hook to reject them", async () => {
    const h = nativeHarness([fixture({ status: "inactive" })])
    await h.service.registerUsage(actions, registration)
    expect(h.updateBudgets).not.toHaveBeenCalled()
    h.rows[0].status = "active"
    await h.service.registerUsage(actions, registration)
    h.rows[0].status = "inactive"
    await h.service.revertUsage(actions, registration)
    expect(h.rows[0].campaign!.budget.used).toBe(1)
  })

  it("holds a competing registration until the compensated budget write commits", async () => {
    const h = nativeHarness([fixture({ limit: null })])
    await h.service.registerUsage(actions, registration)
    const compensationReady = deferred(), allowCommit = deferred(), contenderWaiting = deferred()
    h.pauseBeforeCommit(async (tx) => {
      if (tx.id === 2) { compensationReady.resolve(); await allowCommit.promise }
    })
    const compensation = h.service.revertUsage(actions, registration)
    await compensationReady.promise
    // Observe the competing FOR UPDATE at the repository boundary without
    // timers; committed usage must remain 1 until compensation commits.
    h.observeLockWait((tx) => { if (tx.id === 3) contenderWaiting.resolve() })
    const contender = h.service.registerUsage(actions, registration)
    await contenderWaiting.promise
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.updateBudgets).toHaveBeenCalledTimes(2)
    allowCommit.resolve()
    await compensation
    await contender
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.traces.filter((event) => event.tx === 3 && event.event === "lock-wait")).not.toHaveLength(0)
    expect(h.revert).toHaveBeenCalledTimes(1)
  })

  it("silently omits codes that naturally expire between eligibility lookup and usage registration", async () => {
    const now = new Date("2026-10-10T00:00:00.000Z")
    jest.useFakeTimers({ now })
    try {
      const row = fixture({ campaign: { ...fixture().campaign!, ends_at: new Date(+now + 1_000) } })
      const h = nativeHarness([row])
      const eligible = await h.service.listActivePromotions({ code: [row.code] }, {}, {
        transactionManager: { id: 0, cache: new Map() },
      })
      expect(eligible.map((promotion) => promotion.code)).toEqual([row.code])
      jest.setSystemTime(new Date(+now + 1_000))
      await Promise.all([
        h.service.registerUsage(actions, registration), h.service.registerUsage(actions, registration),
      ])
      expect(h.rows[0].campaign!.budget.used).toBe(0)
      expect(h.updateBudgets).not.toHaveBeenCalled()
      expect(h.register).toHaveBeenCalledTimes(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it("does not provide standalone idempotency for a replayed revert after another registration", async () => {
    const h = nativeHarness()
    await h.service.registerUsage(actions, registration)
    await h.service.revertUsage(actions, registration)
    await h.service.registerUsage(actions, registration)
    await h.service.revertUsage(actions, registration)
    expect(h.rows[0].campaign!.budget.used).toBe(0)
    // The public service has no cart/registration identifier to distinguish a
    // duplicate compensation from the current winner. Durable workflow replay
    // semantics cannot be proved by this in-memory harness.
  })
})

// registerUsageStep is not re-exported by the public core-flows package in
// 2.21.2. Running the public completeCartWorkflow exercises that actual internal
// step and compensation without importing a forbidden dist path or inventing a step.
// Production hook policy is deliberately exercised by its separate test suite.
function completionHarness(h: ReturnType<typeof nativeHarness>, ids: string[]) {
  const links = new Map<string, string>()
  const carts = new Map(ids.map((id) => [id, {
    id, email: registration.customer_email, currency_code: "usd", metadata: {},
    customer: { id: registration.customer_id, email: registration.customer_email, has_account: true },
    total: 85, credit_line_total: 0,
    promotions: [{ id: "promo_welcome" }],
    payment_collection: { id: `paycol_${id}`, payment_sessions: [{
      id: `session_${id}`, provider_id: "pp_stripe_stripe", status: "pending",
    }] },
    items: [{
      id: `item_${id}`, variant_id: "variant_contract", product_id: "product_contract", product_handle: "ordinary-product",
      quantity: 1, unit_price: 100, title: "Contract fixture", requires_shipping: false,
      variant: { id: "variant_contract", manage_inventory: false, product: { id: "product_contract", title: "Contract fixture" } },
      adjustments: [{ id: `adj_${id}`, promotion_id: "promo_welcome", ...actions[0] }],
    }],
    shipping_methods: [], completed_at: null as Date | null,
  }]))
  const query = { graph: jest.fn(async ({ entity, filters }: { entity: string; filters: Record<string, string> }) => {
    if (entity === "cart") return { data: [structuredClone(carts.get(filters.id)!)] }
    if (entity === "order_cart") return { data: links.has(filters.cart_id) ? [{ cart_id: filters.cart_id, order_id: links.get(filters.cart_id) }] : [] }
    if (entity === "shipping_option" || entity === "payment_session") return { data: [] }
    throw new Error(`Unexpected isolated query ${entity}`)
  }) }
  type Link = { cart?: { cart_id: string }; order?: { order_id: string } }
  const link = {
    create: jest.fn(async (data: Link[]) => {
      for (const entry of data) if (entry.cart && entry.order) links.set(entry.cart.cart_id, entry.order.order_id)
    }),
    dismiss: jest.fn(async (data: Link[]) => {
      for (const entry of data) if (entry.cart && entry.order && links.get(entry.cart.cart_id) === entry.order.order_id) links.delete(entry.cart.cart_id)
    }),
  }
  const cart = {
    listCarts: jest.fn(async ({ id }: { id: string[] }) => id.map((key) => structuredClone(carts.get(key)!))),
    listAddresses: jest.fn(async () => []), updateAddresses: jest.fn(async () => []),
    updateCarts: jest.fn(async (data: { id: string; completed_at: Date | null }[]) => data.map((update) => {
      const cart = carts.get(update.id)!
      cart.completed_at = update.completed_at
      return structuredClone(cart)
    })),
  }
  const order = {
    createOrders: jest.fn(async (data: { items: { cart_id: string; id?: string }[] }[]) => data.map((input) => ({
      ...input, id: `order_${input.items[0].cart_id}`,
      items: input.items.map((item, index) => ({ ...item, id: `order_item_${input.items[0].cart_id}_${index}` })),
    }))),
    deleteOrders: jest.fn(async () => {}),
  }
  const payment = {
    authorizePaymentSession: jest.fn(async (id: string) => ({ id: `payment_${id}`, captures: [], currency_code: "usd" })),
    retrievePaymentSession: jest.fn(async (id: string) => ({
      id, status: "authorized", payment: { id: `payment_${id}`, captures: [], currency_code: "usd" },
    })),
    cancelPayment: jest.fn(async () => {}),
  }
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
  const held = new Map<string, ReturnType<typeof deferred>>()
  const locking = {
    acquire: jest.fn(async (key: string) => {
      while (held.has(key)) await held.get(key)!.promise
      held.set(key, deferred())
    }),
    release: jest.fn(async (keys: string[]) => {
      for (const key of keys) { const latch = held.get(key); held.delete(key); latch?.resolve() }
      return true
    }),
  }
  const eventBus = { emit: jest.fn(async () => {}), clearGroupedEvents: jest.fn(async () => {}), releaseGroupedEvents: jest.fn(async () => {}) }
  const container = createMedusaContainer()
  const modules = { query, link, cart, order, payment, logger, locking, promotion: h.service, event_bus: eventBus }
  container.register(Object.fromEntries(Object.entries(modules).map(([key, value]) => [key, asValue(value)])))
  return { container, carts, links, query, link, cart, order, payment, logger, locking }
}

describe("real completeCartWorkflow internal usage step with isolated module repositories", () => {
  it("does not compensate a rejected cart's registration or decrement the winning cart's budget", async () => {
    const h = nativeHarness([fixture({ limit: null })], 2)
    const completion = completionHarness(h, ["cart_winner_a", "cart_winner_b"])
    const results = await Promise.allSettled([
      completeCartWorkflow(completion.container).run({ input: { id: "cart_winner_a" } }),
      completeCartWorkflow(completion.container).run({ input: { id: "cart_winner_b" } }),
    ])
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    const failure = results.find((result) => result.status === "rejected") as PromiseRejectedResult
    expect(failure.reason.message).toMatch(/exceeds the budget limit/)
    expect(h.register).toHaveBeenCalledTimes(2)
    expect(h.revert).not.toHaveBeenCalled()
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(completion.order.createOrders).toHaveBeenCalledTimes(2)
    expect(completion.order.deleteOrders).toHaveBeenCalledTimes(1)
    expect(completion.links.size).toBe(1)
    expect(completion.payment.authorizePaymentSession).toHaveBeenCalledTimes(1)
  })

  it("runs the real usage compensation after payment-step failure and permits another legitimate cart", async () => {
    const h = nativeHarness()
    const completion = completionHarness(h, ["cart_failed", "cart_retry"])
    const failedCart = completion.carts.get("cart_failed")!
    failedCart.items[0].adjustments.push(
      { ...failedCart.items[0].adjustments[0], id: "adjustment_second" },
      { ...failedCart.items[0].adjustments[0], id: "adjustment_third" },
    )
    completion.payment.authorizePaymentSession.mockImplementationOnce(async () => {
      expect(h.rows[0].campaign!.budget.used).toBe(1)
      expect(h.rows[0].used).toBe(1)
      throw new MedusaError(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR, "isolated downstream failure")
    })
    const failed = await completeCartWorkflow(completion.container).run({ input: { id: "cart_failed" }, throwOnError: false })
    expect(failed.errors[0].error).toMatchObject({ message: "isolated downstream failure" })
    expect(failed.transaction.getState()).toBe("reverted")
    expect(failed.transaction.getErrors().filter((error) => error.handlerType === "compensate")).toEqual([])
    expect(h.register).toHaveBeenCalledTimes(1)
    expect(h.revert).toHaveBeenCalledTimes(1)
    expect(h.register.mock.calls[0][0]).toEqual([...actions, ...actions, ...actions])
    expect(h.revert.mock.calls[0][0]).toEqual([...actions, ...actions, ...actions])
    expect(h.revert.mock.calls[0][1]).toEqual(registration)
    expect(h.rows[0].campaign!.budget.used).toBe(0)
    expect(h.rows[0].used).toBe(0)
    expect(completion.links.size).toBe(0)
    expect(completion.order.deleteOrders).toHaveBeenCalledTimes(1)
    expect(completion.carts.get("cart_failed")!.completed_at).toBeNull()

    const next = await completeCartWorkflow(completion.container).run({ input: { id: "cart_retry" } })
    expect(next.transaction.getState()).toBe("done")
    expect(next.errors).toEqual([])
    expect(next.result.id).toBe("order_cart_retry")
    expect(h.rows[0].campaign!.budget.used).toBe(1)
    expect(h.register).toHaveBeenCalledTimes(2)
    expect(h.revert).toHaveBeenCalledTimes(1)

    const retry = await completeCartWorkflow(completion.container).run({ input: { id: "cart_retry" } })
    expect(retry.result.id).toBe("order_cart_retry")
    expect(completion.order.createOrders).toHaveBeenCalledTimes(2)
    expect(h.register).toHaveBeenCalledTimes(2)
    expect(h.revert).toHaveBeenCalledTimes(1)
    expect(h.rows[0].campaign!.budget.used).toBe(1)
  })
})
