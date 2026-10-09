import { createHmac, timingSafeEqual } from "crypto";
import { signingSecret } from "./access-tokens";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PORTRAIT_STYLES = [
  "classic-oil",
  "soft-impression",
  "textured-oil",
  "dark-classic",
] as const;
export type PortraitPhoto = {
  id: string;
  cart_id: string;
  file_id: string;
  name: string;
  mime: string;
  size: number;
  signature: string;
};

export function portraitPhotoSecret(): string {
  const configured = process.env.PORTRAIT_PHOTO_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!configured ||
      configured.length < 32 ||
      /replace|changeme|example/i.test(configured))
  )
    throw new Error("A persistent portrait photo signing secret is required");
  return configured || signingSecret();
}

export function validatePhoto(input: unknown) {
  const value = input as Record<string, unknown> | null;
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.length ||
    value.name.length > 255 ||
    typeof value.content !== "string" ||
    typeof value.mime !== "string"
  )
    throw new Error("Invalid photo");
  if (
    !value.content.length ||
    value.content.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4
  )
    throw new Error("Invalid photo");
  const bytes = Buffer.from(value.content, "base64");
  if (
    !bytes.length ||
    bytes.length > MAX_PHOTO_BYTES ||
    bytes.toString("base64") !== value.content
  )
    throw new Error("Invalid photo");
  const mime = bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? "image/jpeg"
    : bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : bytes.length >= 12 &&
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : undefined;
  const extension =
    mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  if (
    !mime ||
    mime !== value.mime ||
    !new RegExp(`\\.${mime === "image/jpeg" ? "jpe?g" : extension}$`, "i").test(
      value.name,
    )
  )
    throw new Error("Invalid photo");
  const name = value.name
    .split(/[\\/]/)
    .pop()!
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 160);
  return { content: value.content, mime, extension, name, size: bytes.length };
}

function signature(photo: Omit<PortraitPhoto, "signature">) {
  return createHmac("sha256", portraitPhotoSecret())
    .update(
      JSON.stringify([
        "portrait-photo-v1",
        photo.id,
        photo.cart_id,
        photo.file_id,
        photo.name,
        photo.mime,
        photo.size,
      ]),
    )
    .digest("base64url");
}

export function signPhoto(
  photo: Omit<PortraitPhoto, "signature">,
): PortraitPhoto {
  return { ...photo, signature: signature(photo) };
}

export function findPhoto(
  metadata: Record<string, unknown> | null | undefined,
  cartId: string,
  id: string,
): PortraitPhoto | undefined {
  if (!/^[a-f0-9-]{36}$/.test(id)) return undefined;
  const photos = metadata?.portrait_photos;
  if (!Array.isArray(photos)) return undefined;
  const photo = photos.find((p) => p?.id === id) as PortraitPhoto | undefined;
  if (
    !photo ||
    photo.cart_id !== cartId ||
    typeof photo.file_id !== "string" ||
    typeof photo.signature !== "string"
  )
    return undefined;
  try {
    const actual = Buffer.from(photo.signature, "base64url"),
      expected = Buffer.from(signature(photo), "base64url");
    return actual.length === expected.length &&
      timingSafeEqual(actual, expected)
      ? photo
      : undefined;
  } catch {
    return undefined;
  }
}

export function publicPhoto(photo: PortraitPhoto) {
  return { id: photo.id, name: photo.name, mime: photo.mime, size: photo.size };
}

type PortraitCart = { metadata?: Record<string, unknown> | null; items?: ({ variant?: { product?: { handle?: string | null } | null } | null; metadata?: Record<string, unknown> | null } | null)[] | null };
export const PORTRAIT_CART_FIELDS = ["id", "metadata", "items.metadata", "items.variant.product.handle"];
export function portraitCartReady(cart: PortraitCart, cartId: string): boolean {
  return (cart.items || []).every(item => {
    if (item?.variant?.product?.handle !== "pet-portrait-oil-painting") return true;
    const portrait = item.metadata?.portrait as Record<string, unknown> | undefined;
    return Boolean(portrait && PORTRAIT_STYLES.includes(portrait.style as typeof PORTRAIT_STYLES[number]) && typeof portrait.photo_id === "string" && portrait.source_cart_id === cartId && findPhoto(cart.metadata, cartId, portrait.photo_id));
  });
}

/** Only customer-facing customization fields may leave the authenticated order API. */
export function publicPortraitMetadata(metadata: unknown) {
  const portrait = (metadata as { portrait?: Record<string, unknown> } | null)
    ?.portrait;
  if (
    !portrait ||
    !PORTRAIT_STYLES.includes(
      portrait.style as (typeof PORTRAIT_STYLES)[number],
    )
  )
    return undefined;
  const result: Record<string, unknown> = { style: portrait.style };
  for (const key of ["photo_id", "photo_name", "source_cart_id", "notes"]) {
    if (typeof portrait[key] === "string")
      result[key] = portrait[key].slice(0, key === "notes" ? 1000 : 160);
  }
  return { portrait: result };
}
