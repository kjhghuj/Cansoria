import {
  Clock3,
  CreditCard,
  Eye,
  HeartHandshake,
  Paintbrush,
  ShieldCheck,
  Truck,
  UploadCloud,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TrustBadgeKind =
  | "artist"
  | "preview"
  | "secure"
  | "guarantee"
  | "shipping"
  | "upload"
  | "timeline"
  | "quality";

export interface TrustBadgeItem {
  kind: TrustBadgeKind;
  title: string;
  text?: string;
}

interface TrustBadgeGridProps {
  items: TrustBadgeItem[];
  compact?: boolean;
  className?: string;
}

const iconMap: Record<TrustBadgeKind, LucideIcon> = {
  artist: Paintbrush,
  preview: Eye,
  secure: CreditCard,
  guarantee: HeartHandshake,
  shipping: Truck,
  upload: UploadCloud,
  timeline: Clock3,
  quality: ShieldCheck,
};

export function TrustBadgeGrid({
  items,
  compact = false,
  className = "",
}: TrustBadgeGridProps) {
  return (
    <div
      className={`grid gap-3 ${
        compact
          ? "grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      } ${className}`}
    >
      {items.map((item) => {
        const Icon = iconMap[item.kind];

        return (
          <div
            key={`${item.kind}-${item.title}`}
            className="min-w-0 border border-border bg-white px-4 py-3 text-charcoal"
          >
            <div className="flex items-center gap-3">
              <Icon
                className="h-4 w-4 shrink-0 text-terracotta"
                aria-hidden="true"
              />
              <p className="min-w-0 break-words text-xs font-semibold uppercase tracking-[0.18em]">
                {item.title}
              </p>
            </div>
            {item.text && (
              <p className="mt-2 break-words text-xs leading-5 text-charcoal-light">
                {item.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
