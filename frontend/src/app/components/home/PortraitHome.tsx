import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, PaletteIcon, ImageIcon, InfinityIcon, ShieldCheckIcon, UploadSimpleIcon, PaintBrushIcon, PackageIcon, StarIcon } from "@phosphor-icons/react/ssr";
import { Testimonials } from "./Testimonials";

const portraitUrl = "/product/pet-portrait-oil-painting";
const promises = [
  { Icon: PaletteIcon, lines: ["Hand-Painted", "by Real Artists"] },
  { Icon: ImageIcon, lines: ["Preview Before", "Shipping"] },
  { Icon: InfinityIcon, lines: ["Unlimited", "Revisions"] },
  { Icon: ShieldCheckIcon, lines: ["Satisfaction", "Guarantee"] },
];
const steps = [
  { Icon: UploadSimpleIcon, title: "Upload Your Photo", description: "Choose your favorite photo of your pet." },
  { Icon: PaintBrushIcon, title: "Our Artist Paints Your Pet", description: "Real artists hand-paint your portrait with care." },
  { Icon: PackageIcon, title: "Approve & Receive", description: "Preview your artwork, request revisions, and get your masterpiece." },
];
const pets = [
  { name: "Milo", breed: "Golden Retriever", image: "milo" },
  { name: "Luna", breed: "Ragdoll Cat", image: "luna" },
  { name: "Charlie", breed: "French Bulldog", image: "charlie" },
  { name: "Bella", breed: "Tabby Cat", image: "bella" },
  { name: "Cooper", breed: "Cavalier King Charles", image: "cooper" },
  { name: "Daisy", breed: "Poodle", image: "daisy" },
];

export function PortraitHome() {
  return (
    <div className="portrait-home">
      <section className="portrait-hero" aria-labelledby="portrait-hero-title">
        <Image src="/images/home/hero-room.png" alt="A golden retriever beside its hand-painted portrait in a warm, sunlit living room" fill priority sizes="100vw" className="hero-room" />
        <div className="hero-original-art" aria-hidden="true"><Image src="/images/home/hero-room-original-right.webp" alt="" fill priority sizes="(max-width: 640px) 100vw, 57vw" /></div>
        <div className="portrait-container hero-content">
          <p className="hero-eyebrow">Hand-Painted Pet Portraits</p>
          <h1 id="portrait-hero-title">Your Pet.<br />Painted Forever.</h1>
          <p className="hero-description">Turn your favorite photo into a hand-painted portrait,<br className="desktop-break" /> created by real artists. A timeless artwork to cherish<br className="desktop-break" /> for a lifetime.</p>
          <Link href={portraitUrl} className="portrait-button">Create Your Portrait <ArrowRightIcon size={17} weight="light" /></Link>
          <div className="hero-rating"><StarRating /><span>4.9 · Loved by 10,000+ Pet Parents</span></div>
          <div className="hero-promises">{promises.map(({ Icon, lines }) => (
            <div key={lines[0]} className="hero-promise"><Icon weight="light" aria-hidden="true" /><p>{lines[0]}<br />{lines[1]}</p></div>
          ))}</div>
        </div>
      </section>

      <section className="portrait-magic" aria-labelledby="magic-title">
        <div className="portrait-container magic-layout">
          <div className="magic-copy">
            <h2 id="magic-title">See the Magic<br />in Every Brushstroke</h2>
            <p>From a simple photo to a museum-quality painting, we turn your beloved pet into a one-of-a-kind masterpiece.</p>
            <Link className="portrait-text-link" href="/shop?category=pet-portraits">Explore Portraits <ArrowRightIcon weight="light" /></Link>
          </div>
          <div className="magic-comparison" aria-label="Original photograph and hand-painted portrait comparison">
            <figure className="comparison-original">
              <Image src="/images/home/original-photo.webp" alt="Original photograph of a golden retriever outdoors" fill sizes="(max-width: 640px) 38vw, 20vw" />
              <figcaption>Original Photo</figcaption>
            </figure>
            <Image src="/images/home/brushstroke-arrow.webp" alt="" width={56} height={32} className="comparison-arrow" />
            <figure className="comparison-painted">
              <Image src="/images/home/painted-portrait.webp" alt="The same golden retriever transformed into a warm oil portrait" fill sizes="(max-width: 640px) 44vw, 25vw" />
              <figcaption>Hand-Painted Portrait</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="portrait-process" id="process" aria-labelledby="process-title">
        <div className="portrait-container process-layout">
          <div className="process-intro"><h2 id="process-title">How It Works</h2><p>Getting your custom portrait is simple and easy.</p></div>
          <ol className="process-steps">{steps.map(({ Icon, title, description }, index) => (
            <li key={title}><div className="process-step-top"><span className="step-number">0{index + 1}</span><Icon weight="light" aria-hidden="true" /></div><h3>{title}</h3><p>{description}</p></li>
          ))}</ol>
        </div>
      </section>

      <section className="portrait-gallery" id="portraits" aria-labelledby="gallery-title">
        <div className="portrait-container portrait-section-heading">
          <div><h2 id="gallery-title">Real Pets. Real Paintings.</h2><p>Every portrait tells a unique and heartwarming story.</p></div>
          <Link className="portrait-text-link" href="/shop?category=pet-portraits">View More Portraits <ArrowRightIcon weight="light" /></Link>
        </div>
        <div className="pet-gallery-grid">{pets.map(pet => (
          <Link key={pet.name} href={portraitUrl} className="pet-portrait-card" aria-label={`Create a portrait like ${pet.name}, ${pet.breed}`}>
            <div className="pet-portrait-image"><Image src={`/images/home/${pet.image}.webp`} alt={`${pet.name}'s hand-painted portrait with the original photo inset`} fill sizes="(max-width: 640px) 43vw, 16vw" /></div>
            <h3>{pet.name}</h3><p>{pet.breed}</p>
          </Link>
        ))}</div>
      </section>

      <Testimonials />

      <section className="portrait-forever" aria-labelledby="forever-title">
        <div className="forever-photo"><Image src="/images/home/forever-together.webp" alt="A pet parent cuddling her golden retriever beside its framed portrait" fill sizes="(max-width: 640px) 100vw, 56vw" /></div>
        <div className="forever-copy">
          <h2 id="forever-title">More Than a Portrait.<br />A Piece of Them, Forever.</h2>
          <p>Our pet portraits are more than just paintings —<br className="desktop-break" /> they’re a celebration of the unconditional love,<br className="desktop-break" /> joy, and companionship our pets bring to our lives.</p>
          <Link href={portraitUrl} className="portrait-button">Create Your Portrait <ArrowRightIcon size={17} weight="light" /></Link>
        </div>
      </section>
    </div>
  );
}

export function StarRating() {
  return <span className="portrait-stars" role="img" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <StarIcon key={index} weight="fill" aria-hidden="true" />)}</span>;
}
