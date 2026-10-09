import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StoreProduct } from "../types";
import {
  STUDIO,
  STUDIO_CHAT_INSTRUCTION,
  studioProduct,
  studioProductSeo,
} from "../studio-content";
import { GEMINI_SYSTEM_INSTRUCTION, ARTICLES } from "../constants";
import ProductCard from "@/components/ProductCard";
import OurStudioPage, { metadata } from "@/app/our-studio/page";
import { portraitStyles, portraitStylesUrl, portraitUrl } from "../portrait";

const legacy = {
  id: "prod_legacy",
  handle: "pet-portrait-oil-painting",
  title: "Pet Portrait",
  subtitle: "Museum-grade oils by master artists",
  description:
    "Archival fine linen, unlimited revisions and insured worldwide delivery.",
  material: "Archival linen",
  tags: [{ value: "Best Seller" }],
  metadata: {
    rating: 4.8,
    review_count: 156,
    reviews_verified: true,
    free_preview: true,
    best_seller: true,
    story_sections: [{ id: "old", title: "Master artists" }],
  },
  variants: [
    { id: "variant_1", calculated_price: { calculated_amount: 85.02 } },
  ],
} as unknown as StoreProduct;

describe("preparation-stage public facts", () => {
  it("replaces legacy claims without changing commerce inputs", () => {
    const product = studioProduct(legacy);
    expect(product.description).toBe(STUDIO.productDescription);
    expect(product.material).toBeNull();
    expect(product.metadata?.story_sections).toEqual([]);
    expect(product.metadata?.reviews_verified).toBe(false);
    expect(product.variants).toBe(legacy.variants);
    expect(product.id).toBe(legacy.id);
    expect(legacy.description).toContain("unlimited revisions");
    expect(legacy.metadata?.free_preview).toBe(true);
  });
  it("uses safe catalog copy and concept imagery in SEO", () => {
    const seo = studioProductSeo(legacy);
    expect(seo.description).toBe(STUDIO.productDescription);
    expect(seo.openGraph.description).toBe(seo.description);
    expect(seo.openGraph.images[0]?.url).toBe(
      "/images/pet-oil/classic-oil.webp",
    );
    expect(JSON.stringify(seo)).not.toMatch(
      /master artists|archival|unlimited revisions|insured worldwide/i,
    );
  });
  it("suppresses seeded preview, popularity and review badges even if metadata claims verification", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product: legacy }),
    );
    expect(html).toContain("£85.02");
    expect(html).toContain("Style illustration");
    expect(html).not.toMatch(
      /Free Preview|Best Seller|4\.8|156|Archival|Museum-grade/,
    );
  });
  it("shares preparation facts with the actual chat prompt and default articles", () => {
    expect(GEMINI_SYSTEM_INSTRUCTION).toBe(STUDIO_CHAT_INSTRUCTION);
    expect(GEMINI_SYSTEM_INSTRUCTION).toContain(STUDIO.readiness);
    expect(GEMINI_SYSTEM_INSTRUCTION).toContain("identities and nationalities");
    expect(JSON.stringify(ARTICLES)).not.toMatch(
      /the studio reviews your reference|sends a preview before|unlimited revisions/i,
    );
  });
  it("renders a complete studio page with labelled concepts and useful destinations", () => {
    const html = renderToStaticMarkup(createElement(OurStudioPage));
    expect(metadata.alternates?.canonical).toBe("/our-studio");
    for (const section of [
      "Our Approach",
      "Explore the Styles",
      "Preparing Your Portrait",
      "Before Commissions Open",
    ])
      expect(html).toContain(section);
    expect(html).toContain(STUDIO.illustration);
    expect(html).toContain(`href="${portraitStylesUrl}"`);
    for (const style of portraitStyles)
      expect(html).toContain(`href="${portraitUrl}?style=${style.id}"`);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/upload-photo"');
    expect(html).not.toContain("artist-at-work");
    expect(html).not.toContain("profiles are being prepared");
  });
});

it("uses a sensible SEO fallback for an incomplete concept record", () => {
  const seo = studioProductSeo({
    title: null,
    handle: null,
    metadata: null,
    images: [],
  } as unknown as StoreProduct);
  expect(seo.title).toBe("Portrait Concept | Cansoria");
  expect(seo.openGraph.images).toEqual([]);
  expect(seo.alternates.canonical).toBe("/");
});
it("keeps generic concept images without inheriting legacy descriptions", () => {
  const seo = studioProductSeo({
    ...legacy,
    handle: "generic-artwork",
    thumbnail: "/products/canvas.svg",
  });
  expect(seo.openGraph.images[0]?.url).toBe("/products/canvas.svg");
  expect(seo.description).toBe(STUDIO.productDescription);
});
