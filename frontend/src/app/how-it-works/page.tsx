import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
import { PREPARATION_STEPS, STUDIO } from "@/lib/studio-content";
import { portraitStylesUrl } from "@/lib/portrait";
export const metadata: Metadata = {
  title: "How It Works | Cansoria",
  description:
    "Explore portrait styles, prepare a reference photo and discuss your ideas while Cansoria prepares to open commissions.",
  alternates: { canonical: "/how-it-works" },
};
export default function HowItWorksPage() {
  return (
    <StudioPage
      eyebrow="Planning your portrait"
      title="A little photo. A personal starting point."
      description="Explore your options and prepare the details that matter. Our commissioning service is in preparation."
    >
      <ol className="studio-grid">
        {PREPARATION_STEPS.map((step, index) => (
          <li key={step.title} className="studio-card">
            <p className="studio-eyebrow">0{index + 1}</p>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
            <p>
              {step.href === portraitStylesUrl ? (
                <a href={step.href}>{step.link} →</a>
              ) : (
                <Link href={step.href}>{step.link} →</Link>
              )}
            </p>
          </li>
        ))}
      </ol>
      <section className="studio-readiness">
        <p className="studio-eyebrow">Before commissions open</p>
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
