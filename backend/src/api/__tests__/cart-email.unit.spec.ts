import { POST as create } from "../store/carts/route"
import { POST as update } from "../store/carts/[id]/route"
import { POST as claim } from "../store/carts/[id]/customer/route"
import { issueAccessToken } from "../../lib/access-tokens"

const createRun = jest.fn().mockResolvedValue({ result: { id: "cart_a" } })
jest.mock("@medusajs/medusa/core-flows", () => ({ createCartWorkflow: jest.fn(() => ({ run: (...args) => createRun(...args) })), updateCartWorkflowId: "update-cart", transferCartCustomerWorkflowId: "transfer-cart-customer" }))
jest.mock("@medusajs/medusa/api/store/carts/helpers", () => ({ refetchCart: jest.fn().mockResolvedValue({ id: "cart_a" }) }))
function setup(cart: any = { id: "cart_a", customer_id: null }) {
  const customers = { listCustomers: jest.fn().mockResolvedValue([{ id: "cus_guest", has_account: false, email: "registered@example.com" }]), createCustomers: jest.fn().mockResolvedValue({ id: "cus_new_guest", has_account: false }) }
  const carts = { updateCarts: jest.fn(async (_id, data) => Object.assign(cart, data)) }
  const engine = { run: jest.fn().mockResolvedValue({}) }
  const locking = { execute: jest.fn(async (_key, fn) => fn()) }
  const graph = jest.fn().mockImplementation(async () => ({ data: [cart] }))
  const req = { params: { id: "cart_a" }, headers: { "x-cart-access-token": issueAccessToken("cart", "cart_a") }, validatedBody: { email: "registered@example.com" }, queryConfig: { fields: ["id"] }, body: {}, scope: { resolve: key => ({ customer: customers, cart: carts, workflows: engine, locking, query: { graph } }[key]) } } as any
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
  return { req, res, customers, carts, engine, locking, cart }
}
describe("guest checkout using an existing registered email", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters"; jest.clearAllMocks() })
  it("creates a cart with a guest identity even if the email belongs to a registered account", async () => {
    const { req, res, customers } = setup()
    await create(req, res)
    expect(customers.listCustomers).toHaveBeenCalledWith({ email: "registered@example.com", has_account: false })
    expect(customers.createCustomers).not.toHaveBeenCalled()
    expect(createRun).toHaveBeenCalledWith({ input: expect.objectContaining({ customer_id: "cus_guest" }) })
    expect(res.json.mock.calls[0][0]).toHaveProperty("cart_access_token")
  })
  it("prevents default email lookup from auto-attaching a guest cart to a registered account", async () => {
    const { req, res, customers, carts, engine, locking, cart } = setup()
    await update(req, res)
    expect(customers.listCustomers).toHaveBeenCalledWith({ email: "registered@example.com", has_account: false })
    expect(carts.updateCarts).toHaveBeenCalledWith("cart_a", { customer_id: "cus_guest" })
    expect(engine.run).toHaveBeenCalled()
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(cart.customer_id).toBe("cus_guest")
  })
  it("explicit claim is serialized and derives the new identity from authentication", async () => {
    const { req, res, engine, locking } = setup()
    req.auth_context = { actor_id: "cus_real" }; req.validatedBody = { customer_id: "cus_spoof" }
    await claim(req, res)
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(engine.run).toHaveBeenCalledWith(expect.any(String), { input: expect.objectContaining({ customer_id: "cus_real" }) })
  })
  it("cannot overwrite an explicit registered owner with a stale guest token", async () => {
    const { req, res, engine, carts } = setup({ id: "cart_a", customer_id: "cus_victim", customer: { has_account: true } })
    await update(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(carts.updateCarts).not.toHaveBeenCalled()
    expect(engine.run).not.toHaveBeenCalled()
  })
  it("never forwards a foreign address ID for native address updates", async () => {
    const { req, res, engine } = setup()
    req.validatedBody.shipping_address = { id: "addr_victim", address_1: "Changed by attacker", country_code: "us" }
    await update(req, res)
    expect(engine.run.mock.calls[0][1].input.shipping_address).toEqual({ address_1: "Changed by attacker", country_code: "us" })
  })
  it("rejects address string references on cart creation and update", async () => {
    const { req, res, engine } = setup()
    req.validatedBody.shipping_address = "addr_victim"
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createRun).not.toHaveBeenCalled()
    const other = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
    await update(req, other)
    expect(other.status).toHaveBeenCalledWith(400)
    expect(engine.run).not.toHaveBeenCalled()
  })
  it("supports repeated guest checkouts for the same email under Medusa's unique guest constraint", async () => {
    const { req, customers } = setup()
    customers.createCustomers.mockRejectedValue(new Error("unique(email,has_account)"))
    const first = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
    const second = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
    await create(req, first); await create(req, second)
    expect(first.status).toHaveBeenCalledWith(200)
    expect(second.status).toHaveBeenCalledWith(200)
    expect(customers.createCustomers).not.toHaveBeenCalled()
  })
  it("does not apply welcome codes during cart creation", async () => {
    const { req, res } = setup(); req.validatedBody.promo_codes = ["ART15-LEGACY"]
    await create(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(createRun).not.toHaveBeenCalled()
  })
})
