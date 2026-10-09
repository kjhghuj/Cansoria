import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import { randomUUID } from "crypto";
import {
  authorizeCart,
  sensitiveResponse,
} from "../../../../../lib/resource-access";
import { findPhoto, PORTRAIT_STYLES } from "../../../../../lib/portrait-photos";
import { SAFE_CART_FIELDS } from "../../../../../lib/cart-fields";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res);
  const body = req.body as Record<string, unknown>;
  if (
    !body ||
    typeof body.variant_id !== "string" ||
    !/^variant_[\w-]{1,128}$/.test(body.variant_id) ||
    !Number.isInteger(body.quantity) ||
    Number(body.quantity) < 1 ||
    Number(body.quantity) > 10 ||
    !PORTRAIT_STYLES.includes(body.style as (typeof PORTRAIT_STYLES)[number]) ||
    typeof body.photo_id !== "string" ||
    (body.notes !== undefined &&
      (typeof body.notes !== "string" || body.notes.length > 1000))
  )
    return res
      .status(400)
      .json({
        message:
          "Choose a style and upload a photo before adding your portrait.",
      });
  try {
    return await req.scope.resolve(Modules.LOCKING).execute(
      `cart-identity:${req.params.id}`,
      async () => {
        if (!(await authorizeCart(req, req.params.id)))
          return res.status(403).json({ message: "Cart access denied" });
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
        const { data } = await query.graph({
          entity: "cart",
          fields: ["id", "metadata", "completed_at"],
          filters: { id: req.params.id },
        });
        const cart = data[0];
        if (!cart || cart.completed_at)
          return res
            .status(409)
            .json({ message: "This cart is no longer active" });
        const photo = findPhoto(
          cart.metadata,
          cart.id,
          body.photo_id as string,
        );
        if (!photo)
          return res
            .status(400)
            .json({ message: "Upload a photo for this cart first." });
        const { data: variants } = await query.graph({
          entity: "product_variant",
          fields: ["id", "product.handle"],
          filters: { id: body.variant_id as string },
        });
        if (variants[0]?.product?.handle !== "pet-portrait-oil-painting")
          return res
            .status(400)
            .json({ message: "Choose a pet portrait product." });
        await addToCartWorkflow(req.scope).run({
          input: {
            cart_id: cart.id,
            items: [
              {
                variant_id: body.variant_id as string,
                quantity: body.quantity as number,
                metadata: {
                  portrait: {
                    commission_id: randomUUID(),
                    style: body.style,
                    photo_id: photo.id,
                    photo_name: photo.name,
                    source_cart_id: cart.id,
                    notes: body.notes || "",
                  },
                },
              },
            ],
          },
        });
        return res.json({
          cart: await refetchCart(
            cart.id,
            req.scope,
            req.queryConfig?.fields ||
              SAFE_CART_FIELDS.map((field) =>
                field.startsWith("*") ? `${field.slice(1)}.*` : field,
              ),
          ),
        });
      },
      { timeout: 30 },
    );
  } catch {
    return res
      .status(503)
      .json({ message: "Unable to add your portrait. Please try again." });
  }
}
