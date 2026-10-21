import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { COMPANY_INFO } from "@/lib/constants";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Our Story | Cansoria",
  description:
    "The idea behind Cansoria: a personal studio for watches designed, assembled and regulated in-house.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <StudioPage
      eyebrow="Our story"
      title="For the time that stays."
      description="Cansoria began with a simple idea: the hours we keep deserve a watch that feels personal."
    >
      <section className="studio-split">
        <StudioImage
          priority
          src="/images/watches/hero.svg"
          alt="Illustrative studio scene with a Cansoria watch on a wooden bench"
          caption={STUDIO.scene}
        />
        <div className="studio-copy">
          <h2>
            A quiet object.
            <br />A thousand hours.
          </h2>
          <p>
            A watch can mark the happy everyday moments, a new chapter or the
            memory of an old one. The weight you notice at a glance and an
            engraving only you know is there make the idea deeply personal.
          </p>
          <p>
            We are preparing a watch service with this in mind. Our current
            images show possible collections and settings, rather than delivered
            customer orders.
          </p>
          <p>
            <Link href="/our-studio">Explore our approach →</Link>
          </p>
        </div>
      </section>
      <div className="studio-grid">
        <section className="studio-card">
          <h3>Personal fit.</h3>
          <p>
            Start with your wrist and the details that matter to you. Our buying
            guide helps you choose a case size and strap.
          </p>
        </section>
        <section className="studio-card">
          <h3>Thoughtful choices.</h3>
          <p>
            Compare four collections and consider the case, dial and strap you
            would enjoy wearing every day.
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
