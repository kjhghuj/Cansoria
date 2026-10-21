import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage, { generateMetadata } from "@/app/page";
import { WatchCollections } from "@/app/components/home/WatchCollections";
import { WatchHome } from "@/app/components/home/WatchHome";
import { Breadcrumb } from "@/app/product/[handle]/components/Breadcrumb";
import { collectionsUrl } from "../studio-content";
import { STUDIO } from "../studio-content";
import type { StoreProduct } from "../types";

jest.mock("../medusa", () => ({
  getStoreOrdersOpen: jest.fn(async () => false),
}));

function overviewLinkTypes(node: ReactNode): unknown[] {
  if (!isValidElement<{ href?: string; children?: ReactNode }>(node)) return [];
  return [
    ...(node.props.href === collectionsUrl ? [node.type] : []),
    ...Children.toArray(node.props.children).flatMap(overviewLinkTypes),
  ];
}

const watchHandles = [
  "heritage-classic-40",
  "northsea-diver",
  "regent-chronograph",
  "meridian-automatic",
];

describe("merged watch home", () => {
  it("uses native anchors for all three home overview links so repeated hash navigation reaches collections", () => {
    expect(overviewLinkTypes(WatchHome())).toEqual(["a", "a", "a"]);
  });
  it("presents four complete, lazy-loaded collection links without prices", () => {
    const html = renderToStaticMarkup(createElement(WatchCollections));
    expect(html).toContain('id="collections"');
    expect(html).toContain("Explore the Collections");
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html.match(/loading="lazy"/g)).toHaveLength(4);
    expect(html).not.toMatch(/£|\$|From |Contact for Price|rel="preload"/);
    for (const handle of watchHandles) {
      expect(html).toContain(`href="/product/${handle}"`);
      expect(html).toContain(`/images/watches/${handle}.svg`);
    }
    expect(html.match(/Explore this collection/g)).toHaveLength(8);
    expect(html.match(/<p class="portrait-style-caption">Collection illustration/g)).toHaveLength(4);
  });

  it("inserts the collections after the single hero and preserves the existing home sections", async () => {
    const html = renderToStaticMarkup(await HomePage());
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html.match(/class="portrait-hero"/g)).toHaveLength(1);
    expect(html.match(/class="magic-comparison"/g)).toHaveLength(1);
    const sections = ["portrait-hero", "portrait-styles", "portrait-magic", "portrait-process", "portrait-gallery", "portrait-forever"];
    const positions = sections.map((section) => html.indexOf(`class="${section}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(html.match(/class="pet-portrait-card"/g)).toHaveLength(6);
    expect(html).toContain('id="process"');
    expect(html).toContain('id="portraits"');
    expect(html).toContain(`href="${collectionsUrl}"`);
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/gallery"');
    expect(html).toContain('href="/our-studio"');
    expect(html).toContain(STUDIO.illustration);
    expect(html).toContain("Orders in preparation");
  });

  it("sets the home canonical and brand metadata with the watch hero image", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("Cansoria | Watch Concepts");
    expect(metadata.description).toBe(STUDIO.description);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      url: "/",
      images: [{ url: "/images/watches/hero.svg", alt: STUDIO.scene }],
    });
  });

  it("provides a Home / Watches / current product breadcrumb without category filtering", () => {
    const html = renderToStaticMarkup(createElement(Breadcrumb, {
      product: { title: "Heritage Classic 40" } as StoreProduct,
    }));
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain('href="/"');
    expect(html).toContain(`href="${collectionsUrl}"`);
    expect(html).toContain("Watches");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("category=");
  });
});
