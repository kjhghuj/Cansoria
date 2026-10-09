import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomePage, { metadata } from "@/app/page";
import { PortraitStyles } from "@/app/components/home/PortraitStyles";
import { PortraitHome } from "@/app/components/home/PortraitHome";
import { Breadcrumb } from "@/app/product/[handle]/components/Breadcrumb";
import { portraitStyles, portraitStylesUrl, portraitUrl } from "../portrait";
import { STUDIO } from "../studio-content";
import type { StoreProduct } from "../types";

function overviewLinkTypes(node: ReactNode): unknown[] {
  if (!isValidElement<{ href?: string; children?: ReactNode }>(node)) return [];
  return [
    ...(node.props.href === portraitStylesUrl ? [node.type] : []),
    ...Children.toArray(node.props.children).flatMap(overviewLinkTypes),
  ];
}

describe("merged portrait home", () => {
  it("uses native anchors for all three home overview links so repeated hash navigation reaches styles", () => {
    expect(overviewLinkTypes(PortraitHome())).toEqual(["a", "a", "a"]);
  });
  it("presents four complete, lazy-loaded style links without prices", () => {
    const html = renderToStaticMarkup(createElement(PortraitStyles));
    expect(html).toContain('id="styles"');
    expect(html).toContain("Explore Your Style");
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html.match(/loading="lazy"/g)).toHaveLength(4);
    expect(html).not.toMatch(/£|\$|From |Contact for Price|rel="preload"/);
    for (const style of portraitStyles) {
      expect(html).toContain(`href="${portraitUrl}?style=${style.id}"`);
      expect(html).toContain(style.name);
      expect(html).toContain(style.description);
      expect(html).toContain(`${style.name}, style illustration. Explore this style`);
    }
    expect(html.match(/Explore this style/g)).toHaveLength(8);
    expect(html.match(/<p class="portrait-style-caption">Style illustration/g)).toHaveLength(4);
  });

  it("inserts the styles after the single hero and preserves the existing home sections", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
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
    expect(html).toContain(`href="${portraitStylesUrl}"`);
    expect(html).toContain('href="/upload-photo"');
    expect(html).toContain('href="/contact"');
    expect(html).toContain('href="/gallery"');
    expect(html).toContain('href="/our-studio"');
    expect(html).toContain(STUDIO.illustration);
    expect(html).toContain("Commissions in preparation");
    expect(html).not.toContain('href="/shop');
  });

  it("sets the home canonical and brand metadata with the existing hero image", () => {
    expect(metadata.title).toBe("Cansoria | Pet Portrait Concepts");
    expect(metadata.description).toBe(STUDIO.description);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      url: "/",
      images: [{ url: "/images/home/hero-room.png", alt: STUDIO.scene }],
    });
  });

  it("provides a Home / Pet Portraits / current product breadcrumb without category filtering", () => {
    const html = renderToStaticMarkup(createElement(Breadcrumb, {
      product: { title: "Pet Portrait" } as StoreProduct,
    }));
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain('href="/"');
    expect(html).toContain(`href="${portraitStylesUrl}"`);
    expect(html).toContain("Pet Portraits");
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("category=");
  });
});
