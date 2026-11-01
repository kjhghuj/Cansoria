import { decorateCartTotals } from "@medusajs/utils"
import { Order } from "@medusajs/order/dist/models/order"
import { formatOrder } from "@medusajs/order/dist/utils/transform-order"
import orderPlacedHandler from "../../subscribers/order-placed"

describe("order notification amount payload", () => {
  it("queries and forwards the independent tax, discount, credit and pre-tax components", async () => {
    const order = {
      id: "order_amounts", display_id: 1, email: "owner@example.com", currency_code: "usd",
      total: 280.64, subtotal: 272, item_subtotal: 258, shipping_subtotal: 14,
      shipping_total: 12, discount_total: 35.76, discount_tax_total: 5.96, tax_total: 48.44, credit_lines: [{ amount: 10 }],
      shipping_address: { first_name: "Owner" }, shipping_methods: [{ name: "Standard Delivery" }],
      items: [{ quantity: 2, unit_price: 129, total: 278.64 }],
    }
    const graph = jest.fn().mockResolvedValue({ data: [order] })
    const createNotifications = jest.fn().mockResolvedValue({ id: "noti_sent", status: "success" })
    const container = { resolve: jest.fn(key => key === "query" ? { graph } : key === "locking" ? { execute: async (_key: string, fn: () => Promise<unknown>) => fn() } : { createNotifications, listNotifications: jest.fn().mockResolvedValue([]) }) }
    await orderPlacedHandler({ event: { data: { id: order.id } }, container } as any)
    expect(graph).toHaveBeenCalledWith(expect.objectContaining({
      entity: "order", filters: { id: order.id },
      fields: expect.arrayContaining(["total", "item_subtotal", "shipping_subtotal", "discount_total", "discount_tax_total", "tax_total", "credit_lines.amount", "items.total", "shipping_methods.name"]),
    }))
    expect(createNotifications).toHaveBeenCalledWith(expect.objectContaining({
      template: "order_placed", to: order.email,
      data: expect.objectContaining({
        total: order.total, item_subtotal: order.item_subtotal, shipping_subtotal: order.shipping_subtotal,
        tax_total: order.tax_total,
        items: order.items, shipping_methods: order.shipping_methods,
      }),
    }))
    const payload = createNotifications.mock.calls[0][0].data
    expect(Number(payload.discount_subtotal)).toBe(29.8)
    expect(Number(payload.credit_line_total)).toBe(10)
  })

  it("matches the Medusa currency epsilon when a one-cent credit is treated as zero", async () => {
    const order = JSON.parse(JSON.stringify(formatOrder({
      id: "order_credit", email: "owner@example.com", currency_code: "usd",
      items: [{ quantity: 1, unit_price: 129, item: { unit_price: 129 } }],
      shipping_methods: [], credit_lines: [{ amount: 0.01 }],
    }, { entity: Order, includeTotals: true })))
    expect(order.total).toBe(129)
    expect(order.credit_line_total).toBe(0)
    const createNotifications = jest.fn().mockResolvedValue({ id: "noti_sent", status: "success" })
    const graph = jest.fn().mockResolvedValue({ data: [order] })
    const container = { resolve: jest.fn(key => key === "query" ? { graph } : key === "locking" ? { execute: async (_key: string, fn: () => Promise<unknown>) => fn() } : { createNotifications, listNotifications: jest.fn().mockResolvedValue([]) }) }
    await orderPlacedHandler({ event: { data: { id: order.id } }, container } as any)
    const payload = createNotifications.mock.calls[0][0].data
    expect(Number(payload.credit_line_total)).toBe(order.credit_line_total)
    expect(payload.total).toBe(order.total)
    // The public totals utility invokes the same internal credit-line calculator.
    expect(Number(decorateCartTotals({ currency_code: "usd", credit_lines: [{ amount: 0.01 }] }).total)).toBe(0)
  })
})
