import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { STUDIO } from "@/lib/studio-content";
import { getStoreOrdersOpen } from "@/lib/medusa";

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

const collections = [
  {
    handle: "heritage-classic-40",
    name: "Dress",
    description: "Slim cases and quiet dials for tailoring and evenings.",
  },
  {
    handle: "northsea-diver",
    name: "Dive",
    description: "Ceramic bezels and 20 ATM ratings for real water.",
  },
  {
    handle: "regent-chronograph",
    name: "Chronograph",
    description: "Meca-quartz stopwatches for timing what matters.",
  },
  {
    handle: "meridian-automatic",
    name: "Automatic",
    description: "Self-winding movements behind sapphire casebacks.",
  },
];

export const dynamic = "force-dynamic";

export default async function OurStudioPage() {
  const ordersOpen = await getStoreOrdersOpen();
  return (
    <StudioPage
      eyebrow="Our Studio"
      title="A thoughtful approach to watches."
      description={STUDIO.description}
    >
      <section className="studio-split" aria-labelledby="studio-approach-title">
        <div className="studio-copy">
          <p className="studio-eyebrow">01 · Our Approach</p>
          <h2 id="studio-approach-title">
            The little details make it personal.
          </h2>
          <p>
            A case that sits flat on the wrist. A dial you read at a glance. An
            engraving only you know is there. These are the details we want a
            Cansoria watch to hold.
          </p>
          <p>
            Our approach starts with your wrist and how you actually wear time.
            We are developing a watch service around in-house assembly, hand
            regulation, clear communication and attention to your preferences.
          </p>
          <p>
            <Link href="/about">Read our story →</Link>
          </p>
        </div>
        <StudioImage
          priority
          src="/images/watches/heritage-classic-40.svg"
          alt="Dress watch collection illustration"
          caption={STUDIO.illustration}
        />
      </section>
      <section className="studio-section" aria-labelledby="studio-styles-title">
        <div className="studio-section-heading">
          <p className="studio-eyebrow">02 · Explore the Collections</p>
          <h2 id="studio-styles-title">Find the watch that feels like yours.</h2>
          <p>
            Four collections to help you describe your preferred case, dial and
            strap. These images illustrate a direction; they are not delivered
            orders.
          </p>
        </div>
        <div className="studio-style-grid">
          {collections.map((collection) => (
            <figure key={collection.handle}>
              <Link href={"/product/" + collection.handle} aria-label={"Explore " + collection.name}>
                <StudioImage
                  src={"/images/watches/" + collection.handle + ".svg"}
                  alt={collection.name + " collection illustration"}
                />
              </Link>
              <figcaption>
                <h3>{collection.name}</h3>
                <p>{collection.description}</p>
                <p className="studio-image-caption">Collection illustration</p>
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
          <p className="studio-eyebrow">03 · Preparing Your Order</p>
          <h2 id="studio-preparing-title">
            Start with your wrist and a few notes.
          </h2>
        </div>
        <div className="studio-grid">
          <div className="studio-card">
            <h3>Measure your wrist.</h3>
            <p>
              Wrists under 16cm suit 36–38mm cases, 16–18cm suits 38–40mm, and
              larger wrists carry 40–42mm with presence.
            </p>
          </div>
          <div className="studio-card">
            <h3>Think about the strap.</h3>
            <p>
              Leather dresses a watch down, steel adds polish, mesh wears light.
              All straps are quick-release and swappable without tools.
            </p>
          </div>
          <div className="studio-card">
            <h3>Plan your engraving.</h3>
            <p>
              Up to twenty characters on the caseback — initials, a date, or a
              short message. Engrave the occasion, not the trend.
            </p>
          </div>
        </div>
        <p className="studio-section-link">
          <Link href="/how-it-works">Read the Buying Guide →</Link>
        </p>
      </section>
      <section
        className="studio-readiness"
        aria-labelledby="studio-opening-title"
      >
        <p className="studio-eyebrow">04 · Before Orders Open</p>
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
      <StudioCTA ordersOpen={ordersOpen} />
    </StudioPage>
  );
}
