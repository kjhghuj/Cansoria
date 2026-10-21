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

const legacy = {
  id: "prod_legacy",
  handle: "meridian-automatic",
  title: "Meridian Automatic",
  subtitle: "Swiss-made by master watchmakers",
  description:
    "Chronometer-certified accuracy, unlimited servicing and insured worldwide delivery.",
  material: "904L steel",
  tags: [{ value: "Best Seller" }],
  metadata: {
    rating: 4.8,
    review_count: 156,
    reviews_verified: true,
    best_seller: true,
    story_sections: [{ id: "old", title: "Master watchmakers" }],
  },
  variants: [
    { id: "variant_1", calculated_price: { calculated_amount: 334.62 } },
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
    expect(legacy.description).toContain("unlimited servicing");
    expect(legacy.metadata?.best_seller).toBe(true);
  });
  it("presents reviewed admin content once orders are open", () => {
    const product = studioProduct(legacy, { ordersOpen: true });
    expect(product.description).toBe(legacy.description);
    expect(product.subtitle).toBe(legacy.subtitle);
    expect(product.material).toBe("904L steel");
    // Story sections survive; they are no longer unconditionally cleared.
    expect(product.metadata?.story_sections).toEqual(
      legacy.metadata?.story_sections,
    );
    // Verified review claims survive; the legacy fixture is marked verified.
    expect(product.metadata?.reviews_verified).toBe(true);
    expect(product.metadata?.rating).toBe(4.8);
    // Unverified review claims stay suppressed even when orders are open.
    const unverified = studioProduct(
      { ...legacy, metadata: { ...legacy.metadata, reviews_verified: false } },
      { ordersOpen: true },
    );
    expect(unverified.metadata?.reviews_verified).toBe(false);
    expect(unverified.metadata?.review_count).toBe(0);
    expect(unverified.metadata?.rating).toBeNull();
  });
  it("keeps open-store SEO aligned with the reviewed admin description", () => {
    const seo = studioProductSeo(legacy, { ordersOpen: true });
    expect(seo.description).toBe(legacy.description);
  });
  it("uses safe catalog copy and the product image in SEO", () => {
    const seo = studioProductSeo(legacy);
    expect(seo.description).toBe(STUDIO.productDescription);
    expect(seo.openGraph.description).toBe(seo.description);
    expect(JSON.stringify(seo)).not.toMatch(
      /master watchmakers|chronometer-certified|unlimited servicing|insured worldwide/i,
    );
  });
  it("suppresses seeded popularity and review badges even if metadata claims verification", () => {
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product: legacy }),
    );
    expect(html).toContain("$334.62");
    expect(html).toContain("Collection illustration");
    expect(html).not.toMatch(
      /Best Seller|4\.8|156|904L|Swiss-made/,
    );
  });
  it("shares preparation facts with the actual chat prompt and default articles", () => {
    expect(GEMINI_SYSTEM_INSTRUCTION).toBe(STUDIO_CHAT_INSTRUCTION);
    expect(GEMINI_SYSTEM_INSTRUCTION).toContain(STUDIO.readiness);
    expect(GEMINI_SYSTEM_INSTRUCTION).toContain("identities and nationalities");
    expect(JSON.stringify(ARTICLES)).not.toMatch(
      /chronometer-certified|unlimited servicing|the studio reviews your reference/i,
    );
  });
  it("renders a complete studio page with labelled concepts and useful destinations", () => {
    const html = renderToStaticMarkup(createElement(OurStudioPage));
    expect(metadata.alternates?.canonical).toBe("/our-studio");
    for (const section of [
      "Our Approach",
      "Explore the Collections",
      "Preparing Your Order",
      "Before Orders Open",
    ])
      expect(html).toContain(section);
    expect(html).toContain(STUDIO.illustration);
    for (const handle of [
      "heritage-classic-40",
      "northsea-diver",
      "regent-chronograph",
      "meridian-automatic",
    ])
      expect(html).toContain(`href="/product/${handle}"`);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/how-it-works"');
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
  expect(seo.title).toBe("Watch Concept | Cansoria");
  expect(seo.openGraph.images).toEqual([]);
  expect(seo.alternates.canonical).toBe("/");
});
it("keeps the product image without inheriting legacy descriptions", () => {
  const seo = studioProductSeo({
    ...legacy,
    handle: "ellery-everyday",
    thumbnail: "/products/watch.svg",
  });
  expect(seo.openGraph.images[0]?.url).toBe("/products/watch.svg");
  expect(seo.description).toBe(STUDIO.productDescription);
});
