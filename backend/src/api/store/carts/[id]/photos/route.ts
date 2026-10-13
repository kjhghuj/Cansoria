import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { randomUUID } from "crypto";
import {
  authorizeCart,
  sensitiveResponse,
} from "../../../../../lib/resource-access";
import {
  publicPhoto,
  signPhoto,
  validatePhoto,
} from "../../../../../lib/portrait-photos";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res);
  let input: Awaited<ReturnType<typeof validatePhoto>>;
  try {
    input = await validatePhoto(req.body);
  } catch {
    return res
      .status(400)
      .json({ message: "Upload a JPG, PNG or WebP image, up to 10 MB." });
  }
  try {
    return await req.scope.resolve(Modules.LOCKING).execute(
      `cart-identity:${req.params.id}`,
      async () => {
        if (!(await authorizeCart(req, req.params.id)))
          return res.status(403).json({ message: "Cart access denied" });
        const { data } = await req.scope
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({
            entity: "cart",
            fields: ["id", "completed_at", "metadata"],
            filters: { id: req.params.id },
          });
        const cart = data[0];
        if (!cart || cart.completed_at)
          return res
            .status(409)
            .json({ message: "This cart is no longer active" });
        const photos = Array.isArray(cart.metadata?.portrait_photos)
          ? cart.metadata.portrait_photos
          : [];
        if (photos.length >= 20)
          return res
            .status(400)
            .json({ message: "Photo limit reached for this cart" });
        const id = randomUUID();
        const files = req.scope.resolve(Modules.FILE);
        const file = await files.createFiles({
          filename: `${id}.${input.extension}`,
          mimeType: input.mime,
          content: input.content,
          access: "private",
        });
        const photo = signPhoto({
          id,
          cart_id: cart.id,
          file_id: file.id,
          name: input.name,
          mime: input.mime,
          size: input.size,
        });
        // A rejected update does not prove that the database rolled back.
        // Retain the file even on failure: a committed reference must stay readable.
        const appended = await req.scope.resolve(Modules.LOCKING).execute(cart.id, async () => {
          // Upload outside this short cart lock. Re-read active state and registry under the native completion lock.
          const { data: current } = await req.scope.resolve(ContainerRegistrationKeys.QUERY).graph({ entity: "cart", fields: ["id", "completed_at", "metadata"], filters: { id: cart.id } });
          const active = current[0];
          if (!active || active.completed_at) return "inactive";
          const registry = Array.isArray(active.metadata?.portrait_photos) ? active.metadata.portrait_photos : [];
          if (registry.length >= 20) return "limit";
          await req.scope.resolve(Modules.CART).updateCarts(cart.id, {
            metadata: {
              ...active.metadata,
              portrait_photos: [...registry, photo],
            },
          });
          return "appended";
        }, { timeout: 30 });
        if (appended === "inactive") return res.status(409).json({ message: "This cart is no longer active" });
        if (appended === "limit") return res.status(400).json({ message: "Photo limit reached for this cart" });
        return res.status(201).json({ photo: publicPhoto(photo) });
      },
      { timeout: 30 },
    );
  } catch {
    return res
      .status(503)
      .json({ message: "Photo upload unavailable. Please try again." });
  }
}
