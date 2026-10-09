import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text } from "@medusajs/ui";
import type { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types";

const names: Record<string, string> = {
  "classic-oil": "Classic Oil",
  "soft-impression": "Soft Impression",
  "textured-oil": "Textured Oil",
  "dark-classic": "Dark Classic",
};
export default function OrderPortraitDetails({
  data,
}: DetailWidgetProps<AdminOrder>) {
  const portraits = (data.items || []).flatMap((item) => {
    const portrait = item?.metadata?.portrait as
      | Record<string, unknown>
      | undefined;
    return portrait &&
      typeof portrait.style === "string" &&
      names[portrait.style]
      ? [{ item, portrait }]
      : [];
  });
  if (!portraits.length) return null;
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Portrait references & preferences</Heading>
      </div>
      {portraits.map(({ item, portrait }) => (
        <div key={item.id} className="space-y-2 px-6 py-4">
          <Text weight="plus">
            {item.title} · {names[String(portrait.style)]}
          </Text>
          <Text>
            Reference: {String(portrait.photo_name || "Uploaded photo")}
          </Text>
          <Text>
            Artist notes: {String(portrait.notes || "No additional notes")}
          </Text>
          {typeof portrait.photo_id === "string" &&
            /^[a-f0-9-]{36}$/.test(portrait.photo_id) && (
              <a
                className="text-ui-fg-interactive underline"
                href={`/admin/orders/${encodeURIComponent(data.id)}/portrait-photos/${portrait.photo_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open private reference photo
              </a>
            )}
        </div>
      ))}
    </Container>
  );
}
export const config = defineWidgetConfig({ zone: "order.details.after" });
