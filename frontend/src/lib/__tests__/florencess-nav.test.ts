import { describe, expect, it } from "@jest/globals";
import { FL_NAV, type FlNavGroup } from "@/lib/florencess-data";
import { FL_RESERVED_ROUTES, resolveFlSlug } from "@/lib/florencess-routes";

const staticRoutes = new Set<string>(FL_RESERVED_ROUTES);

/** Every href the navigation can render, from any structure level. */
function navHrefs(groups: FlNavGroup[]): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];
  for (const group of groups) {
    links.push({ label: group.label, href: group.href });
    for (const child of group.children ?? []) links.push(child);
    for (const column of group.columns ?? []) {
      links.push(...column.links);
    }
    if (group.promo) links.push({ label: group.promo.title, href: group.promo.href });
  }
  return links;
}

describe("FL_NAV targets", () => {
  it("only points at pages this storefront actually serves", () => {
    const links = navHrefs(FL_NAV);
    expect(links.length).toBeGreaterThan(0);
    const broken = links.filter(
      ({ href }) =>
        !href.startsWith("/") ||
        href.includes("//") ||
        (resolveFlSlug(href.slice(1)) === null && !staticRoutes.has(href.slice(1))),
    );
    expect(broken).toEqual([]);
  });

  it("keeps duplicate labels out of a single rendering surface", () => {
    // `children` and `columns` may overlap by design (legacy panel vs mega
    // menu); within one surface each label must appear once.
    for (const group of FL_NAV) {
      const columnKeys = (group.columns ?? []).flatMap((column) =>
        column.links.map((link) => `${link.href}#${link.label}`),
      );
      expect(new Set(columnKeys).size).toBe(columnKeys.length);
      const childKeys = (group.children ?? []).map((link) => `${link.href}#${link.label}`);
      expect(new Set(childKeys).size).toBe(childKeys.length);
    }
  });

  it("fills mega-menu columns with a promo for the three shop groups", () => {
    const mega = FL_NAV.filter((group) => group.columns);
    expect(mega.map((group) => group.label).sort()).toEqual(["BAGS", "CLOTHING", "SHOES"]);
    for (const group of mega) {
      expect(group.columns!.length).toBeGreaterThanOrEqual(2);
      for (const column of group.columns!) {
        expect(column.links.length).toBeGreaterThan(0);
        for (const link of column.links) {
          expect(typeof link.href).toBe("string");
          expect(link.href.startsWith("/")).toBe(true);
        }
      }
      expect(group.promo?.image.startsWith("/florencess/img/")).toBe(true);
      expect(group.promo?.alt).toBeTruthy();
      expect(group.promo?.title).toBeTruthy();
    }
  });
});
