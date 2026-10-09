import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { portraitStyles, portraitUrl } from "@/lib/portrait";
import { STUDIO } from "@/lib/studio-content";

export const metadata: Metadata = {
  title: "Our Studio | Cansoria",
  description: STUDIO.description,
  alternates: { canonical: "/our-studio" },
  openGraph: {
    title: "Our Studio | Cansoria",
    description: STUDIO.description,
    url: "/our-studio",
  },
};

export default function OurStudioPage() {
  return (
    <StudioPage
      eyebrow="Our Studio"
      title="A thoughtful approach to pet portraits."
      description={STUDIO.description}
    >
      <section className="studio-split" aria-labelledby="studio-approach-title">
        <div className="studio-copy">
          <p className="studio-eyebrow">01 · Our Approach</p>
          <h2 id="studio-approach-title">
            The little details make it personal.
          </h2>
          <p>
            A familiar expression. A favourite blanket. The tilt of a head you
            know by heart. These are the details we want a personal portrait to
            hold.
          </p>
          <p>
            Our approach starts with your reference and the memories behind it.
            We are developing a custom portrait service around thoughtful
            composition, clear communication and attention to your preferences.
          </p>
          <p>
            <Link href="/about">Read our story →</Link>
          </p>
        </div>
        <StudioImage
          priority
          src="/images/pet-oil/classic-oil.webp"
          alt="Classic Oil pet portrait style illustration"
          caption={STUDIO.illustration}
        />
      </section>
      <section className="studio-section" aria-labelledby="studio-styles-title">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">02 · Explore the Styles</p>
          <h2 id="studio-styles-title">Find the mood that feels like them.</h2>
          <p>
            Four concepts to help you describe your preferred colours,
            background and atmosphere. These images illustrate a direction; they
            are not completed orders.
          </p>
        </div>
        <div className="studio-style-grid">
          {portraitStyles.map((style) => (
            <figure key={style.id}>
              <Link href={`${portraitUrl}?style=${style.id}`} aria-label={"Explore " + style.name}>
                <StudioImage
                  src={"/images/pet-oil/" + style.id + ".webp"}
                  alt={style.name + " style illustration"}
                />
              </Link>
              <figcaption>
                <h3>{style.name}</h3>
                <p>{style.description}</p>
                <p className="studio-image-caption">Style illustration</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section
        className="studio-section"
        aria-labelledby="studio-preparing-title"
      >
        <div className="studio-section-heading">
          <p className="studio-eyebrow">03 · Preparing Your Portrait</p>
          <h2 id="studio-preparing-title">
            Start with a photo and a few notes.
          </h2>
        </div>
        <div className="studio-grid">
          <div className="studio-card">
            <h3>Choose an expression.</h3>
            <p>
              Look for clear eyes, natural light and the expression you love.
              Keep the face and ears within the frame.
            </p>
          </div>
          <div className="studio-card">
            <h3>Think about the setting.</h3>
            <p>
              Note your preferred colours, background, composition and where you
              imagine displaying the portrait.
            </p>
          </div>
          <div className="studio-card">
            <h3>Keep the memories.</h3>
            <p>
              Tell us about a collar, a favourite toy or any detail that
              matters. For several pets or older photos, prepare your questions
              in advance.
            </p>
          </div>
        </div>
        <p className="studio-section-link">
          <Link href="/upload-photo">Read the Photo Guide →</Link>
        </p>
      </section>
      <section
        className="studio-readiness"
        aria-labelledby="studio-opening-title"
      >
        <p className="studio-eyebrow">04 · Before Commissions Open</p>
        <h2 id="studio-opening-title">
          Good things begin with clear expectations.
        </h2>
        <p>{STUDIO.readiness}</p>
        <p>
          We will share genuine work and production information once it is
          verified and authorised for publication. For now, explore the concepts
          and tell us what you have in mind.
        </p>
      </section>
      <StudioCTA />
    </StudioPage>
  );
}
