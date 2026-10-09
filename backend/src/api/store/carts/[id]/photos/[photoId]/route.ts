import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  authorizeCart,
  sensitiveResponse,
} from "../../../../../../lib/resource-access";
import { findPhoto } from "../../../../../../lib/portrait-photos";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res);
  try {
    if (!(await authorizeCart(req, req.params.id)))
      return res.status(403).json({ message: "Cart access denied" });
    const { data } = await req.scope
      .resolve(ContainerRegistrationKeys.QUERY)
      .graph({
        entity: "cart",
        fields: ["id", "metadata"],
        filters: { id: req.params.id },
      });
    const photo = findPhoto(
      data[0]?.metadata,
      req.params.id,
      req.params.photoId,
    );
    if (!photo) return res.status(404).json({ message: "Photo not found" });
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
