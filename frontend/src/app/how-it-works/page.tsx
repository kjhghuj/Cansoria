import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
import { studioSteps, STUDIO, STUDIO_OPEN, collectionsUrl } from "@/lib/studio-content";
import { getStoreOrdersOpen } from "@/lib/medusa";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ordersOpen = await getStoreOrdersOpen();
  return {
    title: "How It Works | Cansoria",
    description: ordersOpen
      ? "Choose your size, strap and dial, add complimentary engraving, and order a watch regulated in-house."
      : "Explore the collections, plan your engraving and understand sizing, straps and delivery while Cansoria prepares to open orders.",
    alternates: { canonical: "/how-it-works" },
  };
}
export default async function HowItWorksPage() {
  const ordersOpen = await getStoreOrdersOpen();
  return (
    <StudioPage
      eyebrow={ordersOpen ? "Ordering your watch" : "Planning your watch"}
      title="Your wrist. A personal starting point."
      description={ordersOpen ? "Choose your watch, add your engraving, and place your order today." : "Explore your options and prepare the details that matter. Our watch service is in preparation."}
    >
      <ol className="studio-grid">
        {studioSteps(ordersOpen).map((step, index) => (
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
        <p className="studio-eyebrow">{ordersOpen ? "Orders open" : "Before orders open"}</p>
        <h2>Know what to expect.</h2>
        <p>{ordersOpen ? STUDIO_OPEN.readiness : STUDIO.readiness}</p>
        <p>
          <Link href="/our-studio">Discover our approach →</Link>
        </p>
      </section>
      <StudioCTA ordersOpen={ordersOpen} />
    </StudioPage>
  );
}
