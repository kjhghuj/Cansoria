import { POST } from "../route"
describe("POST /store/test-email", () => {
  it.each([{}, { email: "owner@example.com" }])("returns gone for every input without sending notifications", async body => {
    const resolve = jest.fn(), res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() } as any
    await POST({ body, scope: { resolve } } as any, res)
    expect(res.status).toHaveBeenCalledWith(410)
    expect(resolve).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
  })
})
