import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  PaletteIcon,
  ImageIcon,
  ShieldCheckIcon,
  UploadSimpleIcon,
  PaintBrushIcon,
} from "@phosphor-icons/react/ssr";
import { PREPARATION_STEPS, STUDIO } from "@/lib/studio-content";
import { portraitStylesUrl } from "@/lib/portrait";
import { PortraitStyles } from "./PortraitStyles";
const promises = [
  { Icon: PaletteIcon, lines: ["Four Style", "Concepts"] },
  { Icon: ImageIcon, lines: ["Photo", "Guidance"] },
  { Icon: PaintBrushIcon, lines: ["Personal", "Inspiration"] },
  { Icon: ShieldCheckIcon, lines: ["Clear", "Expectations"] },
];
const icons = [PaletteIcon, UploadSimpleIcon, ShieldCheckIcon];
const pets = [
  { breed: "Golden Retriever", image: "milo" },
  { breed: "Ragdoll Cat", image: "luna" },
  { breed: "French Bulldog", image: "charlie" },
  { breed: "Tabby Cat", image: "bella" },
  { breed: "Cavalier King Charles", image: "cooper" },
  { breed: "Poodle", image: "daisy" },
];
export function PortraitHome() {
  return (
    <div className="portrait-home">
      <section className="portrait-hero" aria-labelledby="portrait-hero-title">
        <Image
          src="/images/home/hero-room.png"
          alt="Illustrative living room scene with a golden retriever and a framed portrait"
          fill
          priority
          sizes="100vw"
          className="hero-room"
        />
        <div className="hero-original-art" aria-hidden="true">
          <Image
            src="/images/home/hero-room-original-right.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 57vw"
          />
        </div>
        <div className="portrait-container hero-content">
          <p className="hero-eyebrow">Pet Portrait Concepts</p>
          <h1 id="portrait-hero-title">
            Your Pet.
            <br />
            Your Story.
          </h1>
          <p className="hero-description">
            Explore portrait ideas inspired by the face you know by heart. Our
            custom pet portrait service is in preparation.
          </p>
          <a href={portraitStylesUrl} className="portrait-button">
            Explore Portrait Styles <ArrowRightIcon size={17} weight="light" />
          </a>
          <div className="hero-rating">
            <span>{STUDIO.scene} · Commissions in preparation</span>
          </div>
          <div className="hero-promises">
            {promises.map(({ Icon, lines }) => (
              <div key={lines[0]} className="hero-promise">
                <Icon weight="light" aria-hidden="true" />
                <p>
                  {lines[0]}
                  <br />
                  {lines[1]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <PortraitStyles />
      <section className="portrait-magic" aria-labelledby="magic-title">
        <div className="portrait-container magic-layout">
          <div className="magic-copy">
            <h2 id="magic-title">
              Ideas Begin
              <br />
              With a Photo.
            </h2>
            <p>
              A familiar expression can inspire a personal portrait. This
              concept comparison explores one possible direction; it is not a
              completed customer order.
            </p>
            <a className="portrait-text-link" href={portraitStylesUrl}>
              Explore Portraits <ArrowRightIcon weight="light" />
            </a>
          </div>
          <div
            className="magic-comparison"
            aria-label="Reference and portrait concept comparison"
          >
            <figure className="comparison-original">
              <Image
                src="/images/home/original-photo.webp"
                alt="Golden retriever reference photo concept"
                fill
                sizes="(max-width: 640px) 38vw, 20vw"
              />
              <figcaption>Reference Concept</figcaption>
            </figure>
            <Image
              src="/images/home/brushstroke-arrow.webp"
              alt=""
              width={56}
              height={32}
              className="comparison-arrow"
            />
            <figure className="comparison-painted">
              <Image
                src="/images/home/painted-portrait.webp"
                alt="Golden retriever portrait style concept"
                fill
                sizes="(max-width: 640px) 44vw, 25vw"
              />
              <figcaption>Portrait Concept</figcaption>
            </figure>
          </div>
        </div>
      </section>
      <section
        className="portrait-process"
        id="process"
        aria-labelledby="process-title"
      >
        <div className="portrait-container process-layout">
          <div className="process-intro">
            <h2 id="process-title">Plan Your Portrait</h2>
            <p>Explore your options while we prepare to open commissions.</p>
          </div>
          <ol className="process-steps">
            {PREPARATION_STEPS.map((step, index) => {
              const Icon = icons[index];
              const StepLink = step.href === portraitStylesUrl ? "a" : Link;
              return (
                <li key={step.title}>
                  <div className="process-step-top">
                    <span className="step-number">0{index + 1}</span>
                    <Icon weight="light" aria-hidden="true" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                  <StepLink href={step.href} className="portrait-text-link">
                    {step.link} →
                  </StepLink>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      <section
        className="portrait-gallery"
        id="portraits"
        aria-labelledby="gallery-title"
      >
        <div className="portrait-container portrait-section-heading">
          <div>
            <h2 id="gallery-title">Portrait Possibilities.</h2>
            <p>
              Style illustrations for inspiration, rather than completed
              commissions.
            </p>
          </div>
          <Link className="portrait-text-link" href="/gallery">
            View Style Gallery <ArrowRightIcon weight="light" />
          </Link>
        </div>
        <div className="pet-gallery-grid">
          {pets.map((pet) => (
            <Link
              key={pet.image}
              href="/gallery"
              className="pet-portrait-card"
              aria-label={"Explore a " + pet.breed + " portrait concept"}
            >
              <div className="pet-portrait-image">
                <Image
                  src={"/images/home/" + pet.image + ".webp"}
                  alt={
                    pet.breed +
                    " portrait style illustration with reference inset"
                  }
                  fill
                  sizes="(max-width: 640px) 43vw, 16vw"
                />
              </div>
              <h3>{pet.breed}</h3>
              <p>Style illustration</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="portrait-forever" aria-labelledby="forever-title">
        <div className="forever-photo">
          <Image
            src="/images/home/forever-together.webp"
            alt="Illustrative scene of a person cuddling a golden retriever beside a portrait"
            fill
            sizes="(max-width: 640px) 100vw, 56vw"
          />
          <span className="portrait-scene-caption">{STUDIO.scene}</span>
        </div>
        <div className="forever-copy">
          <h2 id="forever-title">
            A Familiar Face.
            <br />A Personal Memory.
          </h2>
          <p>
            A favourite expression, a treasured toy, an everyday moment. Tell us
            what makes your companion special while we prepare our portrait
            service.
          </p>
          <Link href="/our-studio" className="portrait-button">
            Discover Our Studio <ArrowRightIcon size={17} weight="light" />
          </Link>
        </div>
      </section>
    </div>
  );
}
