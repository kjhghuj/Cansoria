/**
 * Editorial content captured from the reference storefront: six information
 * articles, the FAQ accordion groups, the contact block and the brand index.
 *
 * The shape here is the render contract — pages only consume these values, so
 * the transcription pipeline (tools/florencess-ref/pipeline/snapshot-pages.mjs)
 * stays the single source of truth and no copy is retyped by hand.
 */
import contentJson from "@/data/florencess-content.json";
import type { FlPageSection, FlStaticPage } from "./florencess-pages";

type FlContentFile = {
  generatedAt: string;
  articles: Record<
    string,
    {
      label: string;
      meta: string;
      blockTag: "div" | "p";
      sections: FlPageSection[];
    }
  >;
  faq: { question: string; blocks: string[] }[];
  contact: { address: string; phone: string; carePhone: string };
  brands: {
    letters: string[];
    groups: { letter: string; items: { slug: string; label: string }[] }[];
    total: number;
  };
};

export const FL_CONTENT = contentJson as unknown as FlContentFile;

export const FL_ARTICLES: Record<string, FlStaticPage> = Object.fromEntries(
  Object.entries(FL_CONTENT.articles).map(([slug, article]) => [
    slug,
    {
      slug,
      key: article.label,
      label: article.label,
      meta: article.meta,
      blockTag: article.blockTag,
      sections: article.sections,
    } satisfies FlStaticPage,
  ]),
);

export const FL_ARTICLE_SLUGS = Object.keys(FL_ARTICLES);

export const FL_FAQ_GROUPS = FL_CONTENT.faq;

export const FL_CONTACT = FL_CONTENT.contact;

export const FL_BRAND_GROUPS = FL_CONTENT.brands.groups;
export const FL_BRAND_LETTERS = FL_CONTENT.brands.letters;
export const FL_BRAND_TOTAL = FL_CONTENT.brands.total;

export type FlBrand = { slug: string; label: string; letter: string };

export const FL_BRANDS: FlBrand[] = FL_BRAND_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, letter: group.letter })),
);

const brandBySlug = new Map(FL_BRANDS.map((brand) => [brand.slug, brand]));

export function getFlBrand(slug: string): FlBrand | undefined {
  return brandBySlug.get(slug);
}

// Manufacturer-to-product memberships require an ID-backed source manifest;
// the captured brand index alone contains only names and links.
