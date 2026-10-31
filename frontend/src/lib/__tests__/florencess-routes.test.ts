import {
  FL_RESERVED_ROUTES,
  flRouteConflicts,
  resolveFlSlug,
} from "../florencess-routes";
import { FL_CATEGORY_SLUGS, FL_PRODUCT_SLUGS } from "../florencess-catalog";

describe("FL route registry", () => {
  it("has no collision between catalogue slugs and static routes", () => {
    expect(flRouteConflicts()).toEqual([]);
    const reserved = new Set<string>(FL_RESERVED_ROUTES);
    for (const slug of [...FL_CATEGORY_SLUGS, ...FL_PRODUCT_SLUGS]) {
      expect(reserved.has(slug)).toBe(false);
    }
  });

  it("resolves categories, products, articles and brands", () => {
    expect(resolveFlSlug("bags-all")?.kind).toBe("category");
    expect(resolveFlSlug("clothing")?.kind).toBe("category");

    const productSlug = FL_PRODUCT_SLUGS[0];
    const product = resolveFlSlug(productSlug);
    expect(product?.kind).toBe("product");
    if (product?.kind === "product") expect(product.product.slug).toBe(productSlug);

    expect(resolveFlSlug("careers")?.kind).toBe("article");
    expect(resolveFlSlug("brand-adidas")?.kind).toBe("brand");
  });

  it("returns null for unknown slugs so the route can 404", () => {
    expect(resolveFlSlug("definitely-not-a-page")).toBeNull();
    expect(resolveFlSlug("brand-not-a-brand")).toBeNull();
  });
});
