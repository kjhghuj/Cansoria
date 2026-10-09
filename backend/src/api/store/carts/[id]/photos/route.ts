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
  let input: ReturnType<typeof validatePhoto>;
  try {
    input = validatePhoto(req.body);
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
        try {
          await req.scope
            .resolve(Modules.CART)
            .updateCarts(cart.id, {
              metadata: {
                ...cart.metadata,
                portrait_photos: [...photos, photo],
              },
            });
        } catch (error) {
          await files.deleteFiles(file.id);
          throw error;
        }
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
