import { renderToStaticMarkup } from "react-dom/server";
import HomePage, { metadata } from "@/app/page";
import { FlorencessHome, TopMarquee } from "@/components/florencess";
import { FL_ALSO_PRODUCTS, FL_SALE_PRODUCTS, FLORENCESS_PRODUCTS } from "../florencess-products";

describe("FLORENCESS home replication", () => {
  const html = renderToStaticMarkup(FlorencessHome());

  it("renders the announcement marquee with the shipping offers", () => {
    const marquee = renderToStaticMarkup(TopMarquee());
    expect(marquee).toContain("fl-topbar");
    expect(marquee).toContain("Orders $40+ Ship Free");
    expect(marquee).toContain("Shop Now. Pay it with Paypal &amp; Bank Card");
    expect(marquee).toContain("3–5 Days Delivery of USPS");
    // 12 sets per group, duplicated once, so the strip never exposes an edge
    expect(marquee.match(/Orders \$40\+ Ship Free/g)).toHaveLength(24);
    // the reference separates messages with empty space only
    expect(marquee).not.toContain("fl-topbar__dot");
    expect(marquee).not.toContain("•");
  });

  it("renders the two-slide hero with per-slide copy and no slider chrome", () => {
    expect(html).toContain('class="fl-hero"');
    // slide 1 — two equal lines over pill buttons
    expect(html).toContain("SPRING/SUMMER 26");
    expect(html).toContain("NEW COLLECTIONS");
    expect(html).toContain("fl-hero__pill");
    expect(html).toContain("fl-hero__line--bold");
    // slide 2 — pale headline, subline and pipe-separated text links
    expect(html).toContain("THE WAREHOUSE SALE");
    expect(html).toContain("UP TO 60% OFF | NEW ADDITIONS | FINAL REDUCTIONS");
    expect(html).toContain("fl-hero__textlink");
    expect(html).toContain("fl-hero__sep");
    // only the two reference slides, and no slider chrome
    expect(html.match(/fl-hero__slide--/g)).toHaveLength(2);
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).not.toContain("fl-hero__arrow");
    expect(html).not.toContain("fl-hero__dot");
    expect(html).toContain("/florencess/img/hero-936.webp");
    expect(html).toContain("/florencess/img/hero-937.webp");
    // the hero only ever shows its own two frames (hero-1 belongs to the mosaic)
    expect(html).not.toContain('class="fl-hero__img" src="/florencess/img/hero-1.webp"');
  });

  it("renders the benefit strip in the reference's own upper-case copy", () => {
    for (const item of [
      "WHO WE ARE",
      "FIVESTAR EXPERIENCE",
      "FREE SHIPPING*",
      "EASY RETURNS",
      "PRICES INCLUDE DUTIES",
    ]) {
      expect(html).toContain(item);
    }
  });

  it("renders both shelves with bare product tiles", () => {
    expect(html).toContain("WAREHOUSE SALE FOR $9.99");
    expect(html).toContain("YOU MAY ALSO LIKE");
    // the reference fills each shelf with sixteen tiles
    expect(FL_SALE_PRODUCTS).toHaveLength(16);
    expect(FL_ALSO_PRODUCTS).toHaveLength(16);
    expect(html.match(/class="fl-card"/g)?.length ?? 0).toBe(32);
    // Reference homepage tiles show image, name and price only.
    expect(html).not.toContain("fl-card__badge");
    expect(html).not.toContain("Quickview");
    expect(html).not.toContain("Add to Cart");
    expect(html).not.toContain("BUY NOW");
    expect(html).not.toContain("Ex Tax");
    // Hover swaps to the second image, matching the reference card markup.
    expect(html).toContain("fl-card__img--alt");
  });

  it("renders the category mosaic, social block and newsletter", () => {
    expect(html).toContain('class="fl-mosaic"');
    expect(html).toContain("BAGS");
    expect(html).toContain("WORLD OF HEELS");
    // the wide tile spans two of the four mosaic cells
    expect(html.match(/fl-tile--wide/g)?.length ?? 0).toBe(3);
    expect(html).toContain("JOIN THE SOCIAL CIRCLE");
    expect(html).toContain("over 1 million fans on instagram");
    expect(html).toContain("THE FLORENCESS NEWSLETTER");
    expect(html).toContain("10% OFF WELCOME BONUS");
    // social and newsletter share one row, not two stacked blocks
    expect(html.match(/fl-sn__half/g)?.length ?? 0).toBe(2);
    expect(html).not.toContain('class="fl-news"');
  });

  it("exposes homepage metadata matching the reference storefront", () => {
    expect(metadata.title).toBe(
      "FLORENCESS | Affordable Online Shopping for Bags, Shoes & Clothing",
    );
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      url: "/",
      images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS warehouse sale" }],
    });
  });

  it("catalog data is complete and locally hosted", () => {
    expect(FLORENCESS_PRODUCTS).toHaveLength(32);
    for (const product of FLORENCESS_PRODUCTS) {
      expect(product.name.length).toBeGreaterThan(0);
      expect(product.price.startsWith("$")).toBe(true);
      // no remote hotlinks: every asset is served from the local replica
      expect(product.image.startsWith("/florencess/img/")).toBe(true);
    }
    // the warehouse shelf is fully discounted, the recommendation shelf is not
    for (const product of FL_SALE_PRODUCTS) {
      expect(product.price).toBe("$9.99");
      expect(product.oldPrice.startsWith("$")).toBe(true);
      expect(product.discount).toMatch(/^-\d+%$/);
    }
    for (const product of FL_ALSO_PRODUCTS) {
      expect(product.oldPrice).toBe("");
      expect(product.discount).toBe("");
    }
  });

  it("home page renders the storefront shell content", () => {
    const page = renderToStaticMarkup(HomePage());
    expect(page).toContain("fl-root");
    expect(page).toContain("WAREHOUSE SALE FOR $9.99");
  });
});
