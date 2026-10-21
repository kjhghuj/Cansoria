import Link from "next/link";
import type { StoreProduct } from "@/lib/types";
import { STUDIO, STUDIO_OPEN } from "@/lib/studio-content";
import { isEngraveableProduct } from "@/lib/engraving";
export default function ProductInfo({
  product,
  ordersOpen = false,
}: {
  product: StoreProduct;
  ordersOpen?: boolean;
}) {
  const engraveable = isEngraveableProduct(product);
  // Spec rows come from the public whitelist (engraveable/movement/
  // water_resistance/warranty) plus the reviewed material field. The
  // preparation-state projection nulls the spec keys, so the table only
  // renders once orders are open.
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const specs = (
    [
      ["Movement", text(metadata.movement)],
      ["Water resistance", text(metadata.water_resistance)],
      ["Case & crystal", text(product.material)],
      ["Warranty", text(metadata.warranty)],
      [
        "Caseback engraving",
        metadata.engraveable === true
          ? "Complimentary, up to 20 characters"
          : null,
      ],
    ] as [string, string | null][]
  ).filter((row): row is [string, string] => Boolean(row[1]));
  const questions = ordersOpen
    ? [
        {
          title: "How do I choose the right case size?",
          text: "Measure around your wrist bone. Wrists under 16cm suit 36–38mm cases, 16–18cm suits 38–40mm, and larger wrists carry 40–42mm with presence.",
        },
        {
          title: "Which strap should I pick?",
          text:
            engraveable
              ? "Leather straps dress a watch down elegantly, steel bracelets add weight and polish, and mesh wears light with a vintage feel. All straps are quick-release and swappable without tools."
              : "Leather straps dress a watch down elegantly, steel bracelets add weight and polish, and mesh wears light with a vintage feel.",
        },
        {
          title: "How does caseback engraving work?",
          text:
            engraveable
              ? "Enter up to twenty characters on this page — initials, a date, or a short message — and choose a font. Engraving is complimentary, cut to order, and inspected under magnification before your watch ships."
              : "This model is not engravable. Engravable models accept up to twenty characters on the caseback at no extra cost.",
        },
        {
          title: "How water resistant is my watch?",
          text: "Each product lists its rating: 3 ATM handles splashes, 5 ATM daily wear, 10 ATM swimming, and 20 ATM recreational diving. Never use the crown or pushers underwater.",
        },
        {
          title: "What warranty and servicing come with it?",
          text: "Every watch arrives with a two-year international warranty and the strap tool needed for quick-release straps. Service arrangements are confirmed with your order.",
        },
      ]
    : [
        {
          title: "How do I choose the right case size?",
          text: "Measure around your wrist bone. Wrists under 16cm suit 36–38mm cases, 16–18cm suits 38–40mm, and larger wrists carry 40–42mm with presence.",
        },
        {
          title: "Which strap should I prepare?",
          text:
            engraveable
              ? "Leather, steel and mesh quick-release straps are planned for every model. You can note your preference now; final specifications will be confirmed before orders open."
              : "Leather, steel and mesh quick-release straps are planned across the collections. Final specifications will be confirmed before orders open.",
        },
        {
          title: "Can I plan an engraving?",
          text:
            engraveable
              ? "Yes — think about initials, a date, or a short message of up to twenty characters. Engraving is planned as a complimentary option on this model."
              : "This model is not planned to be engravable. Other collections accept up to twenty characters on the caseback.",
        },
        {
          title: "How water resistant will my watch be?",
          text: "Planned ratings range from 3 ATM for dress models to 20 ATM for divers. The final rating for this model will be confirmed before orders open.",
        },
        {
          title: "What warranty and servicing are planned?",
          text: "A two-year international warranty is planned for every watch. Service terms will be confirmed before orders open.",
        },
      ];
  return (
    <section className="mt-16 grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
          Size &amp; Preferences
        </p>
        <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
          {ordersOpen ? "The Details That Matter" : "Preparing the Details That Matter"}
        </h2>
        <p className="mt-4 text-sm leading-7 text-charcoal-light">
          {ordersOpen ? STUDIO_OPEN.readiness : STUDIO.readiness}
        </p>
      </div>
      <div className="studio-faq m-0 w-full">
        {questions.map((item, index) => (
          <details key={item.title} open={index === 0}>
            <summary>{item.title}</summary>
            <p>{item.text}</p>
          </details>
        ))}
        <p className="mt-6">
          <Link href="/how-it-works" className="underline">
            Buying Guide →
          </Link>{" "}
          ·{" "}
          <Link href="/contact" className="underline">
            Contact Us →
          </Link>
        </p>
      </div>
      {specs.length > 0 && (
        <section className="mt-10 border border-border bg-white" aria-labelledby="spec-title">
          <p id="spec-title" className="border-b border-border px-5 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-charcoal">
            Specifications
          </p>
          <dl className="divide-y divide-border-subtle">
            {specs.map(([label, value]) => (
              <div key={label} className="flex gap-6 px-5 py-3 text-sm">
                <dt className="w-40 shrink-0 text-charcoal-light">{label}</dt>
                <dd className="min-w-0 flex-1 text-charcoal">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
