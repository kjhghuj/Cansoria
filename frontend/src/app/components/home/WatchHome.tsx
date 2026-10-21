import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  WatchIcon,
  GearFineIcon,
  RulerIcon,
  ShieldCheckIcon,
  PencilLineIcon,
} from "@phosphor-icons/react/ssr";
import { STUDIO, studioSteps, collectionsUrl } from "@/lib/studio-content";
import { WatchCollections } from "./WatchCollections";
const promises = [
  { Icon: GearFineIcon, lines: ["In-House", "Assembly"] },
  { Icon: PencilLineIcon, lines: ["Caseback", "Engraving"] },
  { Icon: RulerIcon, lines: ["Size & Strap", "Options"] },
  { Icon: ShieldCheckIcon, lines: ["Two-Year", "Warranty"] },
];
const icons = [WatchIcon, PencilLineIcon, ShieldCheckIcon];
const models = [
  { name: "Heritage Classic 40", tag: "Dress watch", handle: "heritage-classic-40" },
  { name: "Meridian Automatic", tag: "Automatic", handle: "meridian-automatic" },
  { name: "Regent Chronograph", tag: "Chronograph", handle: "regent-chronograph" },
  { name: "Averly Dress Watch", tag: "Mother-of-pearl", handle: "averly-dress-watch" },
  { name: "Northsea Diver", tag: "20 ATM dive", handle: "northsea-diver" },
  { name: "Lucienne Slim 32", tag: "Ultra-thin", handle: "lucienne-slim-32" },
];
export function WatchHome({ ordersOpen = false }: { ordersOpen?: boolean } = {}) {
  const steps = studioSteps(ordersOpen);
  const heroDescription = ordersOpen
    ? "Order a Cansoria watch in your case size, strap and dial — assembled and regulated in-house, with complimentary caseback engraving."
    : "Explore watch concepts built around in-house assembly and regulation. Our watch service is in preparation.";
  return (
    <div className="portrait-home">
      <section className="portrait-hero" aria-labelledby="portrait-hero-title">
        <Image
          src="/images/watches/hero.svg"
          alt="Illustrative scene with a Cansoria watch on a wooden desk"
          fill
          priority
          sizes="100vw"
          className="hero-room"
        />
        <div className="portrait-container hero-content">
          <p className="hero-eyebrow">Watch Concepts</p>
          <h1 id="portrait-hero-title">
            Your Time.
            <br />
            Your Way.
          </h1>
          <p className="hero-description">
            {heroDescription}
          </p>
          <a href={collectionsUrl} className="portrait-button">
            Explore Watches <ArrowRightIcon size={17} weight="light" />
          </a>
          <div className="hero-rating">
            <span>{STUDIO.scene} · {ordersOpen ? "Orders open" : "Orders in preparation"}</span>
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
      <WatchCollections />
      <section className="portrait-magic" aria-labelledby="magic-title">
        <div className="portrait-container magic-layout">
          <div className="magic-copy">
            <h2 id="magic-title">
              Find the Size
              <br />
              That Wears Right.
            </h2>
            <p>
              The same watch changes character with its case. This concept
              comparison explores how 36mm and 42mm wear on the wrist; it is
              not a delivered customer watch.
            </p>
            <a className="portrait-text-link" href={collectionsUrl}>
              Explore Watches <ArrowRightIcon weight="light" />
            </a>
          </div>
          <div
            className="magic-comparison"
            aria-label="Case size concept comparison"
          >
            <figure className="comparison-original">
              <Image
                src="/images/watches/size-36.svg"
                alt="36mm dress watch concept on a slim wrist"
                fill
                sizes="(max-width: 640px) 38vw, 20vw"
              />
              <figcaption>36mm Concept</figcaption>
            </figure>
            <Image
              src="/images/watches/arrow.svg"
              alt=""
              width={56}
              height={32}
              className="comparison-arrow"
            />
            <figure className="comparison-painted">
              <Image
                src="/images/watches/size-42.svg"
                alt="42mm dive watch concept with presence on the wrist"
                fill
                sizes="(max-width: 640px) 44vw, 25vw"
              />
              <figcaption>42mm Concept</figcaption>
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
            <h2 id="process-title">{ordersOpen ? "Order Your Watch" : "Plan Your Watch"}</h2>
            <p>
              {ordersOpen
                ? "Choose your size, strap and engraving, and place your order today."
                : "Explore your options while we prepare to open orders."}
            </p>
          </div>
          <ol className="process-steps">
            {steps.map((step, index) => {
              const Icon = icons[index];
              const StepLink = step.href === collectionsUrl ? "a" : Link;
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
            <h2 id="gallery-title">Collection Possibilities.</h2>
            <p>
              Collection illustrations for inspiration, rather than delivered
              customer watches.
            </p>
          </div>
          <Link className="portrait-text-link" href="/gallery">
            View Collections <ArrowRightIcon weight="light" />
          </Link>
        </div>
        <div className="pet-gallery-grid">
          {models.map((model) => (
            <Link
              key={model.handle}
              href={`/product/${model.handle}`}
              className="pet-portrait-card"
              aria-label={"Explore the " + model.name + " concept"}
            >
              <div className="pet-portrait-image">
                <Image
                  src={`/images/watches/${model.handle}.svg`}
                  alt={model.name + " collection illustration"}
                  fill
                  sizes="(max-width: 640px) 43vw, 16vw"
                />
              </div>
              <h3>{model.name}</h3>
              <p>{model.tag}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="portrait-forever" aria-labelledby="forever-title">
        <div className="forever-photo">
          <Image
            src="/images/watches/engraving.svg"
            alt="Illustrative scene of an engraved caseback with initials and a date"
            fill
            sizes="(max-width: 640px) 100vw, 56vw"
          />
          <span className="portrait-scene-caption">{STUDIO.scene}</span>
        </div>
        <div className="forever-copy">
          <h2 id="forever-title">
            Initials. A Date.
            <br />Kept in Steel.
          </h2>
          <p>
            {ordersOpen
              ? "Up to twenty characters on the caseback, cut to order and inspected under magnification. Engrave the occasion, and your watch becomes a keepsake."
              : "Up to twenty characters on the caseback, cut to order. Tell us what you would engrave while we prepare our watch service."}
          </p>
          <Link href="/our-studio" className="portrait-button">
            Discover Our Studio <ArrowRightIcon size={17} weight="light" />
          </Link>
        </div>
      </section>
    </div>
  );
}
