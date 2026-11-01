"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FL_HERO_SLIDES } from "@/lib/florencess-data";
import { SITE_DESCRIPTION } from "@/lib/brand";

/**
 * Reference hero: a two-slide master slider that cross-fades on its own, with
 * no previous/next arrows and no pagination dots. Each slide carries its own
 * copy block, and the block is hidden on mobile where the slider shows the
 * image alone.
 */
export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const total = FL_HERO_SLIDES.length;

  useEffect(() => {
    if (total < 2) return;
    const timer = window.setInterval(() => setActive((p) => (p + 1) % total), 6500);
    return () => window.clearInterval(timer);
  }, [total]);

  return (
    <section className="fl-hero" aria-label="Featured collections">
      <h1 className="fl-sr-only">
        {SITE_DESCRIPTION}
      </h1>

      <div className="fl-hero__stage">
        {FL_HERO_SLIDES.map((slide, i) => (
          <div
            className={`fl-hero__slide fl-hero__slide--${slide.variant}${
              i === active ? " is-active" : ""
            }`}
            key={slide.image}
            aria-hidden={i !== active}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fl-hero__img" src={slide.image} alt={slide.alt} />

            <div className="fl-hero__copy">
              {slide.variant === "collections" ? (
                slide.lines.map((line, idx) => (
                  <div
                    className={`fl-hero__line${idx > 0 ? " fl-hero__line--bold" : ""}`}
                    key={line}
                  >
                    {line}
                  </div>
                ))
              ) : (
                <>
                  <div className="fl-hero__headline">{slide.lines[0]}</div>
                  {slide.subline ? <div className="fl-hero__sub">{slide.subline}</div> : null}
                </>
              )}

              <div className="fl-hero__cta">
                {slide.variant === "collections"
                  ? slide.links.map((link) => (
                      <Link className="fl-hero__pill" href={link.href} key={link.label}>
                        {link.label}
                      </Link>
                    ))
                  : slide.links.map((link, idx) => (
                      <span className="fl-hero__pipe" key={link.label}>
                        {idx > 0 ? <span className="fl-hero__sep">|</span> : null}
                        <Link className="fl-hero__textlink" href={link.href}>
                          {link.label}
                        </Link>
                      </span>
                    ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}