import { asValue } from "@medusajs/framework/awilix";
import {
  createMedusaContainer,
  PaymentActions,
} from "@medusajs/framework/utils";
import { MedusaWorkflow } from "@medusajs/framework/workflows-sdk";
import workflowEngine from "@medusajs/medusa/workflow-engine-inmemory";
import {
  completeCartWorkflow,
  processPaymentWorkflow,
} from "@medusajs/medusa/core-flows";
import { signPhoto } from "../../lib/portrait-photos";
import { issueAccessToken } from "../../lib/access-tokens";

import "../../workflows/hooks/complete-cart-validation";

jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({
  refetchCart: jest.fn(async () => ({ id: "cart_a" })),
}));
export const completionPhotoBytes = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 1,
]);
import { Readable } from "stream";

export function completionWorkflowFixture() {
  const photo = signPhoto({
    id: "2c0e1371-36f3-40a7-b8c7-861f3c185559",
    cart_id: "cart_a",
    file_id: "file_a",
    name: "pet.png",
    mime: "image/png",
    size: completionPhotoBytes.length,
  });
  const cart = {
    id: "cart_a",
    email: "owner@example.com",
    currency_code: "usd",
    total: 85,
    credit_line_total: 0,
    customer: { id: "cus_a", email: "owner@example.com", has_account: true },
    customer_id: "cus_a",
    metadata: { portrait_photos: [photo] },
    promotions: [],
    shipping_methods: [],
    completed_at: null,
    items: [
      {
        id: "item_a",
        variant_id: "variant_a",
        product_id: "prod_a",
        product_handle: "pet-portrait-oil-painting",
        quantity: 1,
        unit_price: 100,
        requires_shipping: false,
        title: "Pet portrait",
        variant: {
          id: "variant_a",
          manage_inventory: false,
          product: { id: "prod_a", title: "Pet portrait" },
        },
        metadata: {
          portrait: {
            photo_id: photo.id,
            style: "classic-oil",
            source_cart_id: "cart_a",
          },
        },
        adjustments: [],
      },
    ],
    payment_collection: {
      id: "pc_a",
      payment_sessions: [
        { id: "ps_a", provider_id: "pp_stripe_stripe", status: "pending" },
      ],
    },
  } as any;
  let linked: string | undefined;
  const snapshots: any[] = [];
  const graph = jest.fn(async ({ entity, fields }) => {
    if (entity === "cart") {
      const snapshot = structuredClone(cart);
      if (fields.includes("items.*")) {
        const deepFreeze = (v: any) => {
          if (v && typeof v === "object") {
            Object.values(v).forEach(deepFreeze);
            Object.freeze(v);
          }
        };
        deepFreeze(snapshot);
        snapshots.push(snapshot);
      }
      return { data: [snapshot] };
    }
    if (entity === "product")
      return { data: [{ id: "prod_a", handle: "pet-portrait-oil-painting" }] };
    if (entity === "order_cart")
      return { data: linked ? [{ order_id: linked }] : [] };
    if (entity === "order")
      return { data: [{ id: linked, metadata: { private: true }, items: [] }] };
    if (entity === "payment_session")
      return {
        data:
          fields.includes("payment_collection_id") && !fields.includes("id")
            ? [{ payment_collection_id: "pc_a" }]
            : [],
      };
    if (entity === "cart_payment_collection")
      return { data: [{ cart_id: "cart_a" }] };
    if (entity === "payment" || entity === "shipping_option")
      return { data: [] };
    throw new Error(`Unexpected fixture query ${entity}`);
  });
  const held = new Map<
    string,
    { promise: Promise<void>; resolve: () => void }
  >();
  const events: string[] = [];
  const locking = {
    acquire: jest.fn(async (key: string) => {
      while (held.has(key)) await held.get(key)!.promise;
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      held.set(key, { promise, resolve });
      events.push(`acquire:${key}`);
    }),
    release: jest.fn(async (keys: string[]) => {
      keys.forEach((key) => {
        const gate = held.get(key);
        held.delete(key);
        gate?.resolve();
        events.push(`release:${key}`);
      });
      return true;
    }),
    execute: jest.fn(async (key: string, fn) => {
      while (held.has(key)) await held.get(key)!.promise;
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      held.set(key, { promise, resolve });
      events.push(`identity:${key}`);
      try {
        return await fn();
      } finally {
        held.delete(key);
        resolve();
        events.push(`identity-released:${key}`);
      }
    }),
  };
  const order = {
    createOrders: jest.fn(async (inputs) =>
      inputs.map((input) => ({
        ...input,
        id: "order_a",
        items: input.items.map((item, i) => ({ ...item, id: `oi_${i}` })),
      })),
    ),
    deleteOrders: jest.fn(async () => {}),
  };
  const cartModule = {
    listCarts: jest.fn(async () => [structuredClone(cart)]),
    listAddresses: jest.fn(async () => []),
    updateAddresses: jest.fn(async () => []),
    updateCarts: jest.fn(async (values) =>
      values.map((value) => {
        Object.assign(cart, value);
        return structuredClone(cart);
      }),
    ),
  };
  const link = {
    create: jest.fn(async (values) => {
      for (const v of values) if (v.cart && v.order) linked = v.order.order_id;
    }),
    dismiss: jest.fn(async () => {
      linked = undefined;
    }),
  };
  const payment = {
    authorizePaymentSession: jest.fn(async (id) => ({
      id: `pay_${id}`,
      captures: [],
      currency_code: "usd",
    })),
    retrievePaymentSession: jest.fn(async (id) => ({
      id,
      status: "authorized",
      payment: { id: `pay_${id}`, captures: [] },
    })),
    cancelPayment: jest.fn(async () => {}),
  };
  const files = {
    getDownloadStream: jest.fn(async () =>
      Readable.from([completionPhotoBytes]),
    ),
  };
  const promotion = {
    registerUsage: jest.fn(async () => {}),
    revertUsage: jest.fn(async () => {}),
    listPromotions: jest.fn(async () => [
      {
        id: "promo_a",
        code: "ART15-SAFE",
        status: "active",
        rules: [
          {
            attribute: "customer.id",
            operator: "eq",
            values: [{ value: "cus_a" }],
          },
          {
            attribute: "email",
            operator: "eq",
            values: [{ value: "owner@example.com" }],
          },
        ],
        campaign: { budget: { type: "usage", limit: 1, used: 0 } },
      },
    ]),
  };
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  // Orders are open in this fixture; individual tests close them to exercise the gate.
  const store = {
    listStores: jest.fn(async () => [
      { id: "store_a", metadata: { orders_open: true } },
    ]),
  };
  const event_bus = {
    emit: jest.fn(async () => {}),
    clearGroupedEvents: jest.fn(async () => {}),
    releaseGroupedEvents: jest.fn(async () => {}),
  };
  const container = createMedusaContainer();
  // Use the public native Engine service run method with an isolated LocalWorkflow dispatcher.
  const Engine = workflowEngine.service;
  const engineDependencies = {
    manager: {},
    baseRepository: {},
    workflowExecutionService: {},
    workflowOrchestratorService: {
      run: async (id: string, options: unknown) =>
        MedusaWorkflow.getWorkflow(id)(container).run(options),
    },
  };
  const engine = new Engine(
    engineDependencies as unknown as ConstructorParameters<typeof Engine>[0],
    { scope: "internal" },
  );
  const run = jest.spyOn(engine, "run");
  container.register(
    Object.fromEntries(
      Object.entries({
        query: { graph },
        cart: cartModule,
        order,
        link,
        payment,
        file: files,
        promotion,
        locking,
        logger,
        store,
        event_bus,
        workflows: engine,
      }).map(([k, v]) => [k, asValue(v)]),
    ),
  );
  const req = {
    params: { id: cart.id },
    headers: { "x-cart-access-token": issueAccessToken("cart", cart.id) },
    auth_context: { actor_id: "cus_a" },
    queryConfig: { fields: ["id"] },
    query: {},
    scope: container,
  } as any;
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any;
  return {
    cart,
    files,
    graph,
    snapshots,
    run,
    engine,
    container,
    order,
    promotion,
    payment,
    locking,
    store,
    events,
    req,
    res,
    linked: () => linked,
  };
}
