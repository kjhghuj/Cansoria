import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
import { PREPARATION_STEPS, STUDIO, collectionsUrl } from "@/lib/studio-content";

export const metadata: Metadata = {
  title: "How It Works | Cansoria",
  description:
    "Explore the collections, plan your engraving and understand sizing, straps and delivery while Cansoria prepares to open orders.",
  alternates: { canonical: "/how-it-works" },
};
export default function HowItWorksPage() {
  return (
    <StudioPage
      eyebrow="Planning your watch"
      title="Your wrist. A personal starting point."
      description="Explore your options and prepare the details that matter. Our watch service is in preparation."
    >
      <ol className="studio-grid">
        {PREPARATION_STEPS.map((step, index) => (
          <li key={step.title} className="studio-card">
            <p className="studio-eyebrow">0{index + 1}</p>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            <p>
              {step.href === collectionsUrl ? (
                <a href={step.href}>{step.link} →</a>
              ) : (
                <Link href={step.href}>{step.link} →</Link>
              )}
            </p>
          </li>
        ))}
      </ol>
      <section className="studio-readiness">
        <p className="studio-eyebrow">Before orders open</p>
        <h2>Know what to expect.</h2>
        <p>{STUDIO.readiness}</p>
        <p>
          <Link href="/our-studio">Discover our approach →</Link>
        </p>
      </section>
      <StudioCTA />
    </StudioPage>
  );
}
