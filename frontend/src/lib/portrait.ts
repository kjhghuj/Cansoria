export const portraitStyles = [
  {
    id: "classic-oil",
    name: "Classic Oil",
    description: "Warm, natural colour and timeless detail.",
  },
  {
    id: "soft-impression",
    name: "Soft Impression",
    description: "Airy colour and gentle, expressive brushwork.",
  },
  {
    id: "textured-oil",
    name: "Textured Oil",
    description: "Rich colour with visible, textured brushstrokes.",
  },
  {
    id: "dark-classic",
    name: "Dark Classic",
    description: "A deep background with a quietly dramatic finish.",
  },
] as const;
export type PortraitStyle = (typeof portraitStyles)[number]["id"];
export type UploadedPhoto = {
  id: string;
  name: string;
  mime: string;
  size: number;
  cartId: string;
};
export type PortraitCustomization = {
  style: PortraitStyle;
  photo_id: string;
  notes?: string;
};
export const portraitUrl = "/product/pet-portrait-oil-painting";
export const portraitStylesUrl = "/#styles";
export function getPortraitStyle(value: unknown): PortraitStyle {
  return (
    portraitStyles.find((style) => style.id === value)?.id || "classic-oil"
  );
}
export function portraitSummary(
  metadata: Record<string, unknown> | null | undefined,
) {
  const data = metadata?.portrait as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return null;
  return {
    image: portraitStyles.some(style => style.id === data.style) ? `/images/pet-oil/${data.style}.webp` : null,
    style:
      portraitStyles.find((style) => style.id === data.style)?.name ||
      "Custom portrait",
    photoName: typeof data.photo_name === "string" ? data.photo_name : "",
    photoId:
      typeof data.photo_id === "string" && /^[a-f0-9-]{36}$/.test(data.photo_id)
        ? data.photo_id
        : null,
    cartId:
      typeof data.source_cart_id === "string" &&
      /^cart_[\w-]+$/.test(data.source_cart_id)
        ? data.source_cart_id
        : null,
  };
}
