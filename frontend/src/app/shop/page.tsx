import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import "./pet-oil.css";

const portraitUrl = "/product/pet-portrait-oil-painting";
const styles = [
  { name: "Classic Oil", image: "classic-oil", alt: "Golden Retriever oil portrait in a warm wooden frame" },
  { name: "Soft Impression", image: "soft-impression", alt: "Blue-eyed Ragdoll cat painted in soft, light brushstrokes" },
  { name: "Textured Oil", image: "textured-oil", alt: "Cavalier spaniel portrait with rich, textured oil paint" },
  { name: "Dark Classic", image: "dark-classic", alt: "French Bulldog oil portrait against a deep umber background" },
];

export const metadata: Metadata = {
  title: "Pet Oil Paintings | CANSORIA",
  description: "Turn your favorite photo into a timeless hand-painted pet portrait. Explore four oil painting styles, created by real artists on premium canvas.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Pet Oil Paintings | CANSORIA",
    description: "A portrait made just for you. Painted by hand, made to last.",
    images: [{ url: "/images/pet-oil/hero-room.png", alt: "A Golden Retriever beside its framed oil portrait" }],
  },
};

export default function ShopPage() {
  return (
    <div className="pet-oil-page">
      <section className="pet-oil-hero" aria-labelledby="pet-oil-title">
        <Image
          src="/images/pet-oil/hero-room.png"
          alt="A Golden Retriever in a sunlit cream living room, beneath its hand-painted oil portrait"
          fill
          priority
          sizes="100vw"
          className="pet-oil-hero-image"
        />
        <div className="pet-oil-container pet-oil-hero-content">
          <p className="pet-oil-eyebrow">HAND-PAINTED PET PORTRAITS</p>
          <h1 id="pet-oil-title">Pet Oil<br />Paintings</h1>
          <p className="pet-oil-hero-description">Turn your favorite photo into a timeless<br className="pet-oil-desktop-break" /> hand-painted portrait.</p>
          <Link href={portraitUrl} className="pet-oil-button">Create Your Portrait</Link>
        </div>
      </section>

      <section className="pet-oil-styles" id="styles" aria-labelledby="pet-oil-styles-title">
        <div className="pet-oil-section-heading">
          <h2 id="pet-oil-styles-title">Choose Your Style</h2>
          <p>Every portrait is painted by hand by a real artist.</p>
        </div>
        <div className="pet-oil-style-grid">
          {styles.map(style => (
            <Link href={portraitUrl} className="pet-oil-style-card" key={style.image} aria-label={`${style.name}, from $129. Create your portrait`}>
              <div className="pet-oil-style-image">
                <Image src={`/images/pet-oil/${style.image}.webp`} alt={style.alt} fill sizes="(max-width: 600px) 44vw, (max-width: 900px) 42vw, 23vw" />
              </div>
              <h3>{style.name}</h3>
              <p>From $129</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="pet-oil-craft" id="craft" aria-labelledby="pet-oil-craft-title">
        <div className="pet-oil-craft-image">
          <Image src="/images/pet-oil/artist-at-work.webp" alt="An artist's hand applying oil paint to a Golden Retriever portrait, with brushes and a palette beside the canvas" fill sizes="(max-width: 900px) 100vw, 60vw" />
        </div>
        <div className="pet-oil-container pet-oil-craft-content">
          <h2 id="pet-oil-craft-title">Painted by Hand.<br />Made to Last.</h2>
          <p>Created by real artists on premium canvas.</p>
          <Link href="/#process" className="pet-oil-process-link">Our Process <ArrowRightIcon weight="light" size={20} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="pet-oil-transformation" aria-labelledby="pet-oil-photo-title">
        <h2 id="pet-oil-photo-title">Made From Your Photo</h2>
        <div className="pet-oil-comparison">
          <figure>
            <div className="pet-oil-comparison-image"><Image src="/images/pet-oil/original-photo.webp" alt="Original photograph of a Golden Retriever outdoors" fill sizes="(max-width: 600px) 42vw, 29vw" /></div>
            <figcaption>Original Photo</figcaption>
          </figure>
          <ArrowRightIcon className="pet-oil-comparison-arrow" weight="thin" aria-hidden="true" />
          <figure>
            <div className="pet-oil-comparison-image"><Image src="/images/pet-oil/finished-oil.webp" alt="Finished oil painting of the same Golden Retriever" fill sizes="(max-width: 600px) 42vw, 29vw" /></div>
            <figcaption>Finished Oil Painting</figcaption>
          </figure>
        </div>
      </section>

      <section className="pet-oil-invitation" aria-labelledby="pet-oil-invitation-title">
        <h2 id="pet-oil-invitation-title">Ready to Turn Your Pet Into Art?</h2>
        <p>Create a portrait made just for you.</p>
        <Link href={portraitUrl} className="pet-oil-button">Create Your Portrait</Link>
      </section>
    </div>
  );
}
