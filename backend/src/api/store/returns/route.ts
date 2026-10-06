import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  return res.status(410).json({ type: "gone", message: "Please contact support to request a return." })
}
