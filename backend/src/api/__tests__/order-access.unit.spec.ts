import { GET } from "../store/orders/[id]/route"
import { POST as access } from "../store/orders/access/route"
import { POST as transfer } from "../store/orders/transfer/route"
import { issueAccessToken } from "../../lib/access-tokens"
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
function setup(order: any = { id: "order_a", email: "owner@example.com", customer_id: null }) {
  const graph = jest.fn().mockResolvedValue({ data: order ? [order] : [] })
  const notification = { createNotifications: jest.fn().mockResolvedValue({}) }
  const orders = { updateOrders: jest.fn().mockResolvedValue({}) }
  const locking = { execute: jest.fn(async (_key, fn) => fn()) }
  const req = { params: { id: "order_a" }, headers: {}, body: {}, scope: { resolve: jest.fn((key) => ({ query: { graph }, notification, order: orders, locking }[key])) } } as any
  return { req, graph, notification, orders, locking, res: response() }
}
describe("order ownership and mailbox proof", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters" })
  it("does not reveal guest order data from ID alone", async () => {
    const { req, res } = setup()
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("order")
  })
  it("does not reveal another customer's order to a logged in attacker", async () => {
    const { req, res } = setup({ id: "order_a", customer_id: "cus_victim", customer: { has_account: true } })
    req.auth_context = { actor_id: "cus_attacker" }
    await GET(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
  it("accepts a purpose-bound mailbox token and excludes addresses", async () => {
    const { req, res } = setup({ id: "order_a", email: "owner@example.com", shipping_address: { address_1: "secret" }, items: [{ id: "item_a", product_id: "prod_a", metadata: { secret: 1 } }] })
    req.headers["x-order-access-token"] = issueAccessToken("order", "order_a")
    await GET(req, res)
    expect(res.json.mock.calls[0][0].order).not.toHaveProperty("shipping_address")
    expect(res.json.mock.calls[0][0].order.items[0]).toMatchObject({ product_id: "prod_a" })
    expect(res.json.mock.calls[0][0].order.items[0]).not.toHaveProperty("metadata")
  })
  it.each([null, { id: "order_a", email: "different@example.com" }, { id: "order_a", email: "owner@example.com" }])("access request has a uniform accepted response for %p", async (order) => {
    const { req, res, notification } = setup(order)
    req.body = { order_id: "order_a", email: "owner@example.com" }
    await access(req, res)
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith({ message: "If the details match, an order access link will be emailed." })
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("token")
    expect(notification.createNotifications).toHaveBeenCalledTimes(order?.email === "owner@example.com" ? 1 : 0)
  })
  it("claims only a guest order using authenticated identity inside a lock", async () => {
    const { req, res, orders, locking } = setup({ id: "order_a", customer_id: "cus_guest", customer: { has_account: false } })
    req.auth_context = { actor_id: "cus_real" }
    req.body = { order_id: "order_a", customer_id: "cus_spoof" }
    req.headers["x-order-access-token"] = issueAccessToken("order", "order_a")
    await transfer(req, res)
    expect(locking.execute).toHaveBeenCalledWith("order-claim:order_a", expect.any(Function), expect.any(Object))
    expect(orders.updateOrders).toHaveBeenCalledWith("order_a", { customer_id: "cus_real" })
    expect(res.status).toHaveBeenCalledWith(200)
  })
  it("cannot reassign an already registered customer's order", async () => {
    const { req, res, orders } = setup({ id: "order_a", customer_id: "cus_victim", customer: { has_account: true } })
    req.auth_context = { actor_id: "cus_attack" }; req.body = { order_id: "order_a" }
    req.headers["x-order-access-token"] = issueAccessToken("order", "order_a")
    await transfer(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(orders.updateOrders).not.toHaveBeenCalled()
  })
})
