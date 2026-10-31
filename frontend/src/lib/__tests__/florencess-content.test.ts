import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticPage } from "@/components/florencess";
import {
  FL_ARTICLES,
  FL_ARTICLE_SLUGS,
  FL_BRANDS,
  FL_BRAND_LETTERS,
  FL_CONTACT,
  FL_FAQ_GROUPS,
} from "../florencess-content";
import { resolveFlSlug } from "../florencess-routes";

describe("FLORENCESS editorial content", () => {
  it("carries the six reference information pages", () => {
    expect(FL_ARTICLE_SLUGS.sort()).toEqual([
      "affiliate-program",
      "careers",
      "customer-rewards-program",
      "order-tracking",
      "payment-options",
      "returns-exchanges",
    ]);
    for (const slug of FL_ARTICLE_SLUGS) {
      const article = FL_ARTICLES[slug];
      expect(article.sections.length).toBeGreaterThan(1);
      expect(article.meta).toMatch(/Comment\(s\)/);
      expect(article.sections.map((section) => section.text).join(" ")).not.toContain("CUSTOMER CARE");
      expect(resolveFlSlug(slug)?.kind).toBe("article");
    }
  });

  it("renders an article through the shared static page layout", () => {
    const html = renderToStaticMarkup(
      createElement(StaticPage, { page: FL_ARTICLES["careers"] }),
    );
    expect(html).toContain('class="fl-page"');
    expect(html).toContain("Careers");
  });

  it("keeps the FAQ groups and their answers", () => {
    expect(FL_FAQ_GROUPS.length).toBe(13);
    expect(FL_FAQ_GROUPS[0].question).toBe("REPEATED RETURNS");
    for (const group of FL_FAQ_GROUPS) {
      expect(group.blocks.length).toBeGreaterThan(0);
      expect(group.blocks.join(" ").length).toBeGreaterThan(20);
    }
  });

  it("publishes the measured contact details and no invented address", () => {
    expect(FL_CONTACT.address).toBe(
      "Room C1090, 3A01, 3rd Floor, No. 6 Wuxi Road, Zhongluotan Town, Baiyun District, Guangzhou, Guangdong, China",
    );
    expect(FL_CONTACT.phone).toBe("+1 (646) 391-6438");
    expect(FL_CONTACT.carePhone).toBe("+86 13900747817");
  });

  it("indexes every brand under an existing letter", () => {
    expect(FL_BRANDS.length).toBe(87);
    const letters = new Set(FL_BRAND_LETTERS);
    for (const brand of FL_BRANDS) {
      expect(letters.has(brand.letter)).toBe(true);
      // The reference mixes friendly brand slugs with manufacturer-<id> links.
      expect(/^(brand|manufacturer)-/.test(brand.slug)).toBe(true);
      expect(resolveFlSlug(brand.slug)?.kind).toBe("brand");
    }
  });
});
