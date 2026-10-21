import { asValue } from "@medusajs/framework/awilix";
import { createMedusaContainer } from "@medusajs/framework/utils";
import { MedusaWorkflow } from "@medusajs/framework/workflows-sdk";

export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Isolated repositories for real public update/transfer SDK workflows; no app/database loader runs. */
export function cartWrapperFixture(initial: Record<string, unknown> = {}) {
  const oldEmail = "old@example.com";
  const cart = {
    id: "cart_a",
    email: oldEmail,
    customer_id: "cus_old_guest",
    customer: { id: "cus_old_guest", email: oldEmail, has_account: false },
    completed_at: null,
    sales_channel_id: "sc_a",
    currency_code: "usd",
    region: {
      id: "reg_a",
      currency_code: "usd",
      automatic_taxes: false,
      countries: [{ iso_2: "us" }],
    },
    region_id: "reg_a",
    metadata: { note: "existing" },
    items: [],
    shipping_methods: [],
    promotions: [],
    raw_total: 0,
    payment_collection: {
      id: "pc_a",
      raw_amount: 0,
      currency_code: "usd",
      payment_sessions: [],
    },
    ...initial,
  } as any;
  const original = structuredClone(cart);
  const customers = {
    listCustomers: jest.fn(async () => [
      { id: "cus_guest", email: "registered@example.com", has_account: false },
    ]),
    createCustomers: jest.fn(async () => ({
      id: "cus_guest",
      email: "registered@example.com",
      has_account: false,
    })),
    retrieveCustomer: jest.fn(async (id: string) =>
      id === "cus_real"
        ? { id, email: "owner@example.com", has_account: true }
        : {
            id,
            email: id === "cus_guest" ? "registered@example.com" : oldEmail,
            has_account: false,
          },
    ),
  };
  const events: string[] = [];
  const held = new Map<string, ReturnType<typeof deferred>>();
  const locking = {
    acquire: jest.fn(async (key: string) => {
      while (held.has(key)) await held.get(key)!.promise;
      held.set(key, deferred());
      events.push(`acquire:${key}`);
    }),
    release: jest.fn(async (keys: string[]) => {
      for (const key of keys) {
        const latch = held.get(key);
        held.delete(key);
        latch?.resolve();
        events.push(`release:${key}`);
      }
      return true;
    }),
    execute: jest.fn(async (key: string, fn: () => Promise<unknown>) => {
      await locking.acquire(key);
      try {
        return await fn();
      } finally {
        await locking.release([key]);
      }
    }),
  };
  const controls: {
    failRefresh?: boolean;
    preselection?: ReturnType<typeof deferred>;
    proceed?: ReturnType<typeof deferred>;
  } = {};
  const graph = jest.fn(async ({ entity, fields, filters }) => {
    if (entity === "cart") {
      events.push(`query:cart:${cart.customer_id}:${cart.email}`);
      if (controls.failRefresh && fields.includes("items.*"))
        throw new Error("isolated refresh failure");
      return { data: [structuredClone(cart)] };
    }
    if (entity === "customer")
      return { data: [await customers.retrieveCustomer(filters.id)] };
    if (entity === "variants") return { data: [] };
    throw new Error(`Unexpected cart wrapper fixture query ${entity}`);
  });
  const carts = {
    listCarts: jest.fn(async () => [structuredClone(cart)]),
    listAddresses: jest.fn(async () => []),
    updateAddresses: jest.fn(async () => []),
    updateCarts: jest.fn(async (updates: any[]) => {
      for (const update of updates) {
        Object.assign(cart, update);
        events.push(`update:${cart.customer_id}:${cart.email}`);
        if (
          update.customer_id === "cus_guest" &&
          !Object.prototype.hasOwnProperty.call(update, "email") &&
          controls.preselection
        ) {
          controls.preselection.resolve();
          await controls.proceed!.promise;
        }
      }
      return updates.map(() => structuredClone(cart));
    }),
    updateLineItems: jest.fn(async () => []),
  };
  const event_bus = {
    emit: jest.fn(async () => {}),
    clearGroupedEvents: jest.fn(async () => {}),
    releaseGroupedEvents: jest.fn(async () => {}),
  };
  const promotion = { computeActions: jest.fn(async () => []) };
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  const link = {
    create: jest.fn(async () => []),
    dismiss: jest.fn(async () => []),
  };
  const engine = {
    run: jest.fn(
      async (
        id: string,
        options: { input: Record<string, unknown>; throwOnError?: boolean },
      ) => MedusaWorkflow.getWorkflow(id)(container).run(options),
    ),
  };
  const container = createMedusaContainer();
  container.register(
    Object.fromEntries(
      Object.entries({
        customer: customers,
        cart: carts,
        locking,
        query: { graph },
        event_bus,
        promotion,
        logger,
        link,
        remoteQuery: jest.fn(async () => []),
        sales_channel: {
          retrieveSalesChannel: jest.fn(async () => ({
            id: "sc_a",
            is_disabled: false,
          })),
        },
        workflows: engine,
      }).map(([k, v]) => [k, asValue(v)]),
    ),
  );
  return {
    cart,
    original,
    customers,
    carts,
    container,
    locking,
    events,
    held,
    graph,
    controls,
    engine,
  };
}
