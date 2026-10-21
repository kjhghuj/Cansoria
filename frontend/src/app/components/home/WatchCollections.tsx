import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { STUDIO } from "@/lib/studio-content";

const collections = [
  {
    handle: "heritage-classic-40",
    name: "Dress",
    description: "Slim cases, quiet dials, and cuffs that never catch.",
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

export function WatchCollections() {
  return (
    <section
      className="portrait-styles"
      id="collections"
      aria-labelledby="portrait-styles-title"
    >
      <div className="portrait-container">
        <div className="portrait-styles-heading">
          <h2 id="portrait-styles-title">Explore the Collections</h2>
          <p>{STUDIO.illustration}</p>
        </div>
        <div className="portrait-style-grid">
          {collections.map((collection) => (
            <Link
              key={collection.handle}
              href={`/product/${collection.handle}`}
              className="portrait-style-card"
              aria-label={`${collection.name} collection illustration. Explore this collection`}
            >
              <div className="portrait-style-image">
                <Image
                  src={`/images/watches/${collection.handle}.svg`}
                  alt={`${collection.name} watch collection illustration`}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 44vw, (max-width: 1023px) 42vw, 21vw"
                />
              </div>
              <h3>{collection.name}</h3>
              <p className="portrait-style-description">{collection.description}</p>
              <p className="portrait-style-caption">Collection illustration</p>
              <span className="portrait-style-link">
                Explore this collection <ArrowRightIcon size={16} weight="light" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
