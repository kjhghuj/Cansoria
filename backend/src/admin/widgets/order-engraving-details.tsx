import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Container, Heading, Text } from "@medusajs/ui";
import type { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types";

const fonts: Record<string, string> = {
  script: "Classic Script",
  serif: "Roman Serif",
  sans: "Modern Sans",
};
const MAX_CHARS = 20;
const TEXT_PATTERN = /^[A-Za-z0-9 .,:'"&\-()/]+$/;

function readEngraving(metadata: unknown) {
  const engraving = (metadata as { engraving?: Record<string, unknown> } | null)
    ?.engraving;
  if (
    !engraving ||
    typeof engraving.text !== "string" ||
    !engraving.text ||
    engraving.text.length > MAX_CHARS ||
    !TEXT_PATTERN.test(engraving.text)
  )
    return null;
  return {
    text: engraving.text,
    font:
      typeof engraving.font === "string" && fonts[engraving.font]
        ? fonts[engraving.font]
        : null,
    notes:
      typeof engraving.notes === "string" && engraving.notes.trim()
        ? engraving.notes
        : null,
  };
}

/**
 * Fulfilment view for engraved watches: SKU, text, font, and studio notes per
 * line item. Legacy portrait orders are intentionally not rendered here; their
 * reference-photo links were removed with the photo upload flow.
 */
export default function OrderEngravingDetails({
  data,
}: DetailWidgetProps<AdminOrder>) {
  const engravings = (data.items || []).flatMap((item) => {
    const engraving = readEngraving(item?.metadata);
    return engraving ? [{ item, engraving }] : [];
  });
  if (!engravings.length) return null;
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Caseback engravings</Heading>
      </div>
      {engravings.map(({ item, engraving }) => (
        <div key={item.id} className="space-y-2 px-6 py-4">
          <Text weight="plus">{item.title}</Text>
          {item.variant_sku ? <Text>SKU: {item.variant_sku}</Text> : null}
          <Text>
            Engraving: &ldquo;{engraving.text}&rdquo;
            {engraving.font ? ` · ${engraving.font}` : ""}
          </Text>
          {engraving.notes ? <Text>Studio notes: {engraving.notes}</Text> : null}
        </div>
      ))}
    </Container>
  );
}
export const config = defineWidgetConfig({ zone: "order.details.after" });
