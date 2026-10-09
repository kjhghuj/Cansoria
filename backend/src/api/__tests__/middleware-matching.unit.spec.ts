import path from "path"
import http from "http"
import { Socket } from "net"
import express from "express"
const frameworkHttp = path.dirname(require.resolve("@medusajs/framework/http"))
const { MiddlewareFileLoader } = require(path.join(frameworkHttp, "middleware-file-loader"))
const { RoutesSorter } = require(path.join(frameworkHttp, "routes-sorter"))

async function exercise(app: ReturnType<typeof express>, url: string, method = "GET") {
  const req = new http.IncomingMessage(new Socket()) as any
  req.url = url; req.method = method; req.headers = {}; req.body = { cart_id: "cart_a" }
  req.scope = { resolve: (key: string) => key === "configModule" ? { projectConfig: { http: { jwtSecret: "test" } } } : ({ graph: async () => ({ data: [{ id: "cart_a", customer_id: null }] }) }) }
  const res = new http.ServerResponse(req)
  return new Promise<{ status: number; body: string }>(resolve => {
    res.end = ((chunk: any) => { resolve({ status: res.statusCode, body: String(chunk || "") }); return res }) as any
    ;(app as any).handle(req, res)
  })
}
describe("Medusa's actual middleware loader and Express matching", () => {
  it("guards native cart subroutes, payment resources and legacy order transfers after framework normalization", async () => {
    const loader = new MiddlewareFileLoader()
    await loader.scanDir(path.resolve(__dirname, ".."))
    const app = express()
    for (const route of new RoutesSorter(loader.getMiddlewares()).sort()) {
      if (!route.methods?.length) app.use(route.matcher, route.handler)
      else for (const method of route.methods) app[method.toLowerCase()](route.matcher, route.handler)
    }
    app.use((_req, res) => res.status(200).json({ bypassed: true }))
    const original = process.env.REDIS_URL; delete process.env.REDIS_URL
    try {
      for (const endpoint of ["/store/carts/cart_a", "/store/carts/cart_a/line-items", "/store/carts/cart_a/complete", "/store/carts/cart_a/customer", "/store/carts/cart_a/photos", "/store/carts/cart_a/portrait-items", "/store/payment-collections", "/store/payment-collections/paycol_a/payment-sessions"]) {
        const result = await exercise(app, endpoint, "POST")
        expect(result.status).toBe(403)
        expect(result.body).not.toContain("bypassed")
      }
      for (const action of ["request", "accept", "cancel", "decline"]) expect((await exercise(app, `/store/orders/order_a/transfer/${action}`, "POST")).status).toBe(410)
    } finally { if (original) process.env.REDIS_URL = original }
  })
})
