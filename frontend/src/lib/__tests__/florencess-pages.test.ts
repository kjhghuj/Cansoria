import { renderToStaticMarkup } from "react-dom/server";
import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES, FL_STATIC_PAGE_SLUGS } from "../florencess-pages";
import { FL_FOOTER_COLUMNS } from "../florencess-data";

describe("FLORENCESS static policy pages", () => {
  it("stores all five reference pages under their reference slugs", () => {
    expect(FL_STATIC_PAGE_SLUGS).toEqual([
      "about-us",
      "shipping-policy",
      "terms-conditions",
      "privacy-policy",
      "cookie-policy",
    ]);
    for (const slug of FL_STATIC_PAGE_SLUGS) {
      const page = FL_STATIC_PAGES[slug];
      expect(page.slug).toBe(slug);
      expect(page.label.length).toBeGreaterThan(0);
      expect(page.sections.length).toBeGreaterThan(0);
      // every reference page carries the "… Comment(s) … View(s)" meta line
      expect(page.meta).toMatch(/Comment\(s\)/);
    }
  });

  it("keeps the About page structure: display title plus blank spacer blocks", () => {
    const about = FL_STATIC_PAGES["about-us"];
    expect(about.label).toBe("About Us");
    const display = about.sections.filter((s) => s.kind === "display");
    expect(display.map((s) => s.text)).toEqual(["FLORENCESS"]);
    // the reference separates paragraphs with empty <div><br></div> blocks
    expect(about.sections.filter((s) => s.kind === "spacer").length).toBeGreaterThan(25);
    const text = about.sections.map((s) => s.text).join("\n");
    expect(text).toContain("Our Origin: Born from Urban Inspiration and Real Need");
    expect(text).toContain("Who We Create For: The Modern City Woman");
    expect(text).toContain("Tianjin Xigucheng Educational Technology Co., Ltd.");
  });

  it("keeps the policy prose verbatim, including dividers and bullets", () => {
    const shipping = FL_STATIC_PAGES["shipping-policy"].sections.map((s) => s.text);
    expect(shipping).toContain("1) Processing Time");
    expect(shipping).toContain("3) Delivery Times");
    expect(shipping).toContain("6) Lost or Delayed Packages");
    expect(shipping.some((t) => t.startsWith("• US & Canada: 3–7 business days"))).toBe(true);
    expect(shipping.filter((t) => t === "⸻").length).toBeGreaterThanOrEqual(5);

    const terms = FL_STATIC_PAGES["terms-conditions"].sections.map((s) => s.text).join("\n");
    expect(terms).toContain("7) Liability");
    expect(terms).toContain("8) Governing Law");

    const privacy = FL_STATIC_PAGES["privacy-policy"].sections.map((s) => s.text).join("\n");
    expect(privacy).toContain("3) Sharing Information");
    expect(privacy).toContain("service@entntnt.com");

    const cookie = FL_STATIC_PAGES["cookie-policy"].sections.map((s) => s.text).join("\n");
    expect(cookie).toContain("1) What Are Cookies?");
    expect(cookie).toContain("4) Consent");
  });

  it("renders the reference layout: title band, meta line and inset prose column", () => {
    const html = renderToStaticMarkup(StaticPage({ page: FL_STATIC_PAGES["shipping-policy"] }));
    expect(html).toContain('class="fl-page"');
    expect(html).toContain("fl-page__head");
    expect(html).toContain('<h1 class="fl-page__title">Shipping Policy</h1>');
    // the meta line exists but the reference hides every chip, so it is sr-only
    expect(html).toContain('class="fl-page__meta fl-sr-only"');
    expect(html).toContain("07 Sep 0 Comment(s) 2802 View(s)");
    expect(html).toContain('class="fl-page__prose fl-page__prose--p"');
    // policy pages use empty <p> spacers that collapse to zero height
    expect(html).toContain('<p class="fl-page__spacer" aria-hidden="true"></p>');
    // prose is plain paragraphs — no invented headings, lists or ad slots
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("<img");
  });

  it("renders the About page display heading and spacers", () => {
    const html = renderToStaticMarkup(StaticPage({ page: FL_STATIC_PAGES["about-us"] }));
    expect(html).toContain('<h2 class="fl-page__display">FLORENCESS</h2>');
    // About Us lays its prose out as bare divs whose spacers hold a <br>
    expect(html).toContain('class="fl-page__prose fl-page__prose--div"');
    expect(html).toContain('<div class="fl-page__spacer" aria-hidden="true"><br/></div>');
  });

  it("links the five pages from the footer columns", () => {
    const hrefs = FL_FOOTER_COLUMNS.flatMap((c) => c.links.map((l) => l.href));
    for (const slug of FL_STATIC_PAGE_SLUGS) {
      expect(hrefs).toContain(`/${slug}`);
    }
  });
});
