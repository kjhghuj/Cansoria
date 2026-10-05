"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StoreProduct } from "@/lib/types";

interface ProductInfoProps {
  product: StoreProduct;
}

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-charcoal">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-charcoal-light transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-[520px] pb-5" : "max-h-0"
        }`}
      >
        <div className="text-sm leading-7 text-charcoal-light">{children}</div>
      </div>
    </div>
  );
}

function getDimensions(product: StoreProduct) {
  const dimensions = [product.length, product.width, product.height].filter(
    (value): value is number => typeof value === "number"
  );

  return dimensions.length > 0 ? `${dimensions.join(" x ")} mm` : undefined;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const specs = [
    product.material ? { label: "Material", value: product.material } : null,
    product.weight ? { label: "Weight", value: `${product.weight}g` } : null,
    getDimensions(product)
      ? { label: "Dimensions", value: getDimensions(product) }
      : null,
  ].filter((spec): spec is { label: string; value: string } => Boolean(spec));

  return (
    <section className="mt-16 grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
          Details & FAQ
        </p>
        <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
          Everything to Know Before You Order
        </h2>
      </div>

      <div className="border-t border-border">
        <AccordionItem title="Will the painting look like my photo?" defaultOpen>
          The artist uses your photo as the main reference and focuses on
          likeness, expression, posture, and the details that make the image
          personal. The final piece is still a hand-painted oil painting, so it
          has brushwork and artistic depth rather than a flat printed-photo look.
        </AccordionItem>

        <AccordionItem title="Can I preview the painting before shipping?" defaultOpen>
          Yes. For custom artwork, Cansoria sends a digital preview before your
          finished canvas ships, so you can review the overall likeness,
          composition, and direction before delivery.
        </AccordionItem>

        <AccordionItem title="How do I upload my photo?">
          After checkout, we request your reference photo and any notes for the
          artist. You can share details such as background preference, names,
          mood, canvas orientation, or anything important to preserve.
        </AccordionItem>

        <AccordionItem title="How long does it take?">
          Production time depends on the size, style, and complexity of the
          painting. Most custom orders move through artist preparation, preview,
          approval, and shipping in a planned sequence, with tracking shared
          once the canvas leaves the studio.
        </AccordionItem>

        <AccordionItem title="What is the canvas quality?">
          Cansoria focuses on premium stretched canvas, layered oil-paint
          texture, and careful packing for wall-ready artwork.{" "}
          {specs.length > 0 && (
            <span>
              Current product details:{" "}
              {specs.map((spec) => `${spec.label}: ${spec.value}`).join("; ")}.
            </span>
          )}
        </AccordionItem>

        <AccordionItem title="Can you paint pets or old photos?">
          Yes. Pet portraits, family photos, wedding moments, and older images
          can all be transformed into oil paintings. Clearer references help,
          but the artist can often work with cherished older photos too.
        </AccordionItem>

        <AccordionItem title="Do you ship internationally?">
          Yes. Cansoria supports worldwide delivery, with available shipping
          options calculated during checkout based on your address.
        </AccordionItem>

        <AccordionItem title="What if I am not satisfied?">
          The preview step is designed to catch concerns before shipping. If
          your finished artwork arrives damaged or does not match the approved
          direction, contact support with your order details so we can help with
          a resolution. You can also review the{" "}
          <Link href="/returns" className="text-terracotta hover:underline">
            returns policy
          </Link>
          .
        </AccordionItem>
      </div>
    </section>
  );
}
