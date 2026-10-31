import type { Metadata } from "next";
import Link from "next/link";
import { FL_BRAND_GROUPS, FL_BRAND_LETTERS, FL_BRAND_TOTAL } from "@/lib/florencess-content";

export const metadata: Metadata = {
  title: "Brands | FLORENCESS",
  description: `Browse all ${FL_BRAND_TOTAL} brands carried by FLORENCESS.`,
  alternates: { canonical: "/brands" },
};

export default function BrandsPage() {
  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Brands</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Brands</li>
        </ol>
      </div>

      <div className="fl-container">
        <div className="fl-brands">
          <nav aria-label="Brand index">
            <ul className="fl-brands__nav">
              {FL_BRAND_LETTERS.map((letter) => (
                <li key={letter}>
                  <a href={`#${letter}`} aria-label={`Jump to brands starting with ${letter}`}>
                    {letter}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {FL_BRAND_GROUPS.map((group) => (
            <section className="fl-brands__group" id={group.letter} key={group.letter}>
              <h2 className="fl-brands__letter">{group.letter}</h2>
              <ul className="fl-brands__list">
                {group.items.map((brand) => (
                  <li key={brand.slug}>
                    <Link href={`/${brand.slug}`}>{brand.label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
