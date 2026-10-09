import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { serveOrderPhoto } from "../../../../../../lib/order-photos";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return serveOrderPhoto(req, res);
}
