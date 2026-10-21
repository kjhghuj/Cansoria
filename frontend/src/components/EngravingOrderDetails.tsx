import { engravingSummary } from "@/lib/engraving";

export default function EngravingOrderDetails({
  metadata,
}: {
  metadata?: Record<string, unknown> | null;
}) {
  const engraving = engravingSummary(metadata);
  if (!engraving) return null;
  return (
    <div className="mt-2 space-y-1 text-xs text-charcoal-light">
      <p>
        Engraving: <span className="font-medium text-charcoal">“{engraving.text}”</span>{" "}
        · {engraving.font}
      </p>
      {engraving.notes && <p>Notes: {engraving.notes}</p>}
    </div>
  );
}
