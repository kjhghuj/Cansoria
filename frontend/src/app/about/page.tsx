import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { COMPANY_INFO } from "@/lib/constants";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Our Story | Cansoria",
  description:
    "The idea behind Cansoria: a personal place for the companions and memories we love.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <StudioPage
      eyebrow="Our story"
      title="For the love that stays."
      description="Cansoria began with a simple idea: the companions we love deserve a place in the art we live with."
    >
      <section className="studio-split">
        <StudioImage
          priority
          src="/images/home/hero-room.png"
          alt="Illustrative living room scene with a golden retriever and a framed portrait"
          caption={STUDIO.scene}
        />
        <div className="studio-copy">
          <h2>
            A familiar face.
            <br />A thousand memories.
          </h2>
          <p>
            A portrait can celebrate the happy everyday moments, a new companion
            or the memory of an old friend. The expression you know, a favourite
            blanket and a familiar setting can make the idea deeply personal.
          </p>
          <p>
            We are preparing a custom pet portrait service with this in mind.
            Our current images show possible styles and settings, rather than
            completed customer orders.
          </p>
          <p>
            <Link href="/our-studio">Explore our approach →</Link>
          </p>
        </div>
      </section>
      <div className="studio-grid">
        <section className="studio-card">
          <h3>Personal inspiration.</h3>
          <p>
            Start with a photo and the details that matter to you. Our photo
            guide helps you prepare a clear reference.
          </p>
        </section>
        <section className="studio-card">
          <h3>Thoughtful choices.</h3>
          <p>
            Compare four style concepts and consider the colours, mood and
            composition you would like.
          </p>
        </section>
        <section className="studio-card">
          <h3>Questions welcome.</h3>
          <p>
            <Link href="/contact">Contact us</Link> or email{" "}
            <a href={"mailto:" + COMPANY_INFO.supportEmail}>
              {COMPANY_INFO.supportEmail}
            </a>{" "}
            to share your ideas.
          </p>
        </section>
      </div>
      <p className="mt-10 text-center text-sm leading-6 text-charcoal-light">
        {STUDIO.readiness}
      </p>
      <StudioCTA />
    </StudioPage>
  );
}
