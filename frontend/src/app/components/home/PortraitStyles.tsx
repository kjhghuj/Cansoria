import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { portraitStyles, portraitUrl } from "@/lib/portrait";
import { STUDIO } from "@/lib/studio-content";

export function PortraitStyles() {
  return (
    <section
      className="portrait-styles"
      id="styles"
      aria-labelledby="portrait-styles-title"
    >
      <div className="portrait-container">
        <div className="portrait-styles-heading">
          <h2 id="portrait-styles-title">Explore Your Style</h2>
          <p>{STUDIO.illustration}</p>
        </div>
        <div className="portrait-style-grid">
          {portraitStyles.map((style) => (
            <Link
              key={style.id}
              href={`${portraitUrl}?style=${style.id}`}
              className="portrait-style-card"
              aria-label={`${style.name}, style illustration. Explore this style`}
            >
              <div className="portrait-style-image">
                <Image
                  src={`/images/pet-oil/${style.id}.webp`}
                  alt={`${style.name} pet portrait style illustration`}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 44vw, (max-width: 1023px) 42vw, 21vw"
                />
              </div>
              <h3>{style.name}</h3>
              <p className="portrait-style-description">{style.description}</p>
              <p className="portrait-style-caption">Style illustration</p>
              <span className="portrait-style-link">
                Explore this style <ArrowRightIcon size={16} weight="light" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
