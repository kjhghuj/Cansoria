import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
import { getStoreOrdersOpen } from "@/lib/medusa";
import { studioFaq } from "@/lib/studio-content";
import { serializeJsonLd } from "@/lib/security-json";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ordersOpen = await getStoreOrdersOpen();
  return {
    title: ordersOpen
      ? "FAQ: Ordering, Engraving & Delivery | Cansoria"
      : "Frequently Asked Questions | Cansoria",
    description: ordersOpen
      ? "How to order a Cansoria watch: sizes, straps, dials, engraving, delivery and what happens after you place your order."
      : "Buying guidance, collection concepts and the current preparation status of Cansoria orders.",
    alternates: { canonical: "/faq" },
  };
}

const buyingQuestions = [
  {
    title: "How do I choose the right case size?",
    text: "Measure around your wrist bone. Wrists under 16cm suit 36–38mm cases, 16–18cm suits 38–40mm, and larger wrists carry 40–42mm with presence. When in doubt, size down.",
  },
  {
    title: "Which strap should I choose?",
    text: "Leather straps dress a watch down elegantly, steel bracelets add weight and polish, and mesh wears light with a vintage feel. All straps are quick-release and swappable without tools.",
  },
  {
    title: "How does caseback engraving work?",
    text: "Engravable models accept up to twenty characters — initials, a date, or a short message — with a choice of fonts. Engraving is planned as a complimentary option and does not reserve an order or confirm production.",
  },
  {
    title: "Can I plan a gift engraving?",
    text: "Yes. Note the words you have in mind and keep the occasion in mind rather than the trend — dates and initials outlast phrases. Contact us to discuss your ideas; availability has not yet been confirmed.",
  },
];

const openBuyingQuestions = [
  {
    title: "How do I choose the right case size?",
    text: "Measure around your wrist bone. Wrists under 16cm suit 36–38mm cases, 16–18cm suits 38–40mm, and larger wrists carry 40–42mm with presence. When in doubt, size down.",
  },
  {
    title: "Which strap should I choose?",
    text: "Leather straps dress a watch down elegantly, steel bracelets add weight and polish, and mesh wears light with a vintage feel. All straps are quick-release and swappable without tools.",
  },
  {
    title: "How does caseback engraving work?",
    text: "Enter up to twenty characters on the product page, choose a font, and add the watch to your cart. Engraving is complimentary, cut to order, and inspected under magnification before your watch ships.",
  },
  {
    title: "Can I order more than one watch?",
    text: "Yes. Add each watch to your cart with its own size, strap, dial and engraving, and check out together. The studio checks every watch in the order before it ships.",
  },
];

export default async function FAQPage() {
  const ordersOpen = await getStoreOrdersOpen();
  const faq = studioFaq(ordersOpen);
  const buying = ordersOpen ? openBuyingQuestions : buyingQuestions;
  const deliveryAnswer = `Read our delivery information and returns information. ${
    ordersOpen
      ? "Delivery options and costs are calculated at checkout."
      : "These arrangements will be confirmed before orders open."
  }`;
  // The FAQPage schema mirrors exactly what the page renders, question for
  // question, so AI engines and rich results cite the live answers.
  const schemaQuestions = [
    ...faq,
    ...buying,
    { title: "Where can I find service and delivery information?", text: deliveryAnswer },
  ].map((item) => ({
    "@type": "Question",
    name: item.title,
    acceptedAnswer: { "@type": "Answer", text: item.text },
  }));
  return (
    <>
      <StudioPage
        eyebrow="A few helpful answers"
        title={ordersOpen ? "Ordering, made clear." : "Before the first order."}
        description={
          ordersOpen
            ? "How orders work — from configuration to engraving to your door."
            : "Explore the collections, prepare your preferences and understand what is still being determined."
        }
      >
        <div className="studio-faq">
          {[...faq, ...buying].map((item) => (
            <details key={item.title}>
              <summary>{item.title}</summary>
              <p>{item.text}</p>
            </details>
          ))}
          <details>
            <summary>Where can I find service and delivery information?</summary>
            <p>
              Read our <Link href="/shipping">delivery information</Link> and{" "}
              <Link href="/returns">returns information</Link>.{" "}
              {ordersOpen
                ? "Delivery options and costs are calculated at checkout."
                : "These arrangements will be confirmed before orders open."}
            </p>
          </details>
          <p className="mt-8">
            Still have a question? <Link href="/contact">Contact Us →</Link>
          </p>
        </div>
        <StudioCTA ordersOpen={ordersOpen} />
      </StudioPage>
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: schemaQuestions,
          }),
        }}
      />
    </>
  );
}
