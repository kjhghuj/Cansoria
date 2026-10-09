import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { verifyAccessToken } from "./access-tokens";
import { customerActor, sensitiveResponse } from "./resource-access";
import { findPhoto } from "./portrait-photos";

export async function serveOrderPhoto(
  req: MedusaRequest,
  res: MedusaResponse,
  admin = false,
) {
  sensitiveResponse(res);
  const tokenValid = verifyAccessToken(
    req.headers["x-order-access-token"],
    "order",
    req.params.id,
  );
  const actor = customerActor(req);
  if (!admin && !tokenValid && !actor)
    return res.status(403).json({ message: "Order access denied" });
  try {
    const { data } = await req.scope
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({
        entity: "order",
        fields: ["id", "customer_id", "metadata", "cart.id", "items.metadata"],
        filters: { id: req.params.id, is_draft_order: false } as any,
      });
    const order = data[0];
    if (!order || (!admin && !tokenValid && order.customer_id !== actor))
      return res.status(403).json({ message: "Order access denied" });
    const photo = order.cart?.id
      ? findPhoto(order.metadata, order.cart.id, req.params.photoId)
      : undefined;
    if (
      !photo ||
      !order.items?.some(
        (item) => (item?.metadata as any)?.portrait?.photo_id === photo.id,
      )
    )
      return res.status(404).json({ message: "Photo not found" });
    const bytes = await req.scope
      .resolve(Modules.FILE)
      .getAsBuffer(photo.file_id);
    res.setHeader("Content-Type", photo.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(bytes);
  } catch {
    return res.status(503).json({ message: "Photo unavailable" });
  }
}
