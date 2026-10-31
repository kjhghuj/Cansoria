import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { FL_FAQ_GROUPS } from "@/lib/florencess-content";
import { serializeJsonLd } from "@/lib/security-json";

export const metadata: Metadata = {
  title: "FAQ | FLORENCESS",
  description:
    "Answers about shipping, returns, payment, sizing and orders at FLORENCESS.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // The schema mirrors the rendered accordions one-for-one so rich results and
  // AI answers cite exactly the copy a visitor can read.
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FL_FAQ_GROUPS.map((group) => ({
      "@type": "Question",
      name: group.question,
      acceptedAnswer: { "@type": "Answer", text: group.blocks.join(" ") },
    })),
  };

  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">FAQ</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>FAQ</li>
        </ol>
      </div>

      <div className="fl-container">
        <div className="fl-faq">
          {FL_FAQ_GROUPS.map((group) => (
            <details className="fl-faq__item" key={group.question}>
              <summary className="fl-faq__question">{group.question}</summary>
              <div className="fl-faq__answer">
                {group.blocks.map((block, index) => (
                  <p key={index}>{block}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
      />
    </>
  );
}
