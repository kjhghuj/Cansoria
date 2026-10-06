import { POST } from "../store/returns/route"
describe("retired public returns flow", () => {
  it.each([{}, { order_id: "order_victim", receive_now: true, items: [{ id: "item_victim", quantity: 1 }] }])("does not invoke any workflow for %p", async body => {
    const resolve = jest.fn(), res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() } as any
    await POST({ body, scope: { resolve } } as any, res)
    expect(res.status).toHaveBeenCalledWith(410)
    expect(res.json).toHaveBeenCalledWith({ type: "gone", message: "Please contact support to request a return." })
    expect(resolve).not.toHaveBeenCalled()
  })
})
