import fs from "node:fs";
import path from "node:path";
import { FL_CATALOG, flDiscountedProducts, flHasVerifiedDiscount } from "../florencess-catalog";
import { FL_SALE_PRODUCTS, FL_ALSO_PRODUCTS } from "../florencess-products";
import { resolveFlSlug } from "../florencess-routes";

const catalogRoot = path.resolve(process.cwd(), "public");

describe("FLORENCESS catalogue delivery", () => {
  it("keeps every product id and slug unique with an existing detail and image", () => {
    expect(FL_CATALOG.categories).toHaveLength(25);
    expect(FL_CATALOG.products).toHaveLength(1298);
    expect(new Set(FL_CATALOG.products.map((item) => item.id)).size).toBe(1298);
    expect(new Set(FL_CATALOG.products.map((item) => item.slug)).size).toBe(1298);
    for (const product of FL_CATALOG.products) {
      expect(product.pageCaptured).toBe(true);
      expect(product.price).toMatch(/^\$\d/);
      expect(resolveFlSlug(product.slug)?.kind).toBe("product");
      expect(product.localImages.length).toBeGreaterThan(0);
      for (const image of product.localImages) {
        expect(image.src.startsWith("/florencess/catalog/")).toBe(true);
        expect(fs.existsSync(path.join(catalogRoot, image.src.slice(1)))).toBe(true);
      }
    }
  });

  it("resolves each category membership and every homepage product", () => {
    const ids = new Set(FL_CATALOG.products.map((product) => product.id));
    for (const category of FL_CATALOG.categories) {
      expect(new Set(category.productIds).size).toBe(category.productIds.length);
      for (const id of category.productIds) expect(ids.has(id)).toBe(true);
      if (!category.empty && category.pagesCaptured !== category.pageCount) {
        throw new Error(`${category.slug}: ${category.pagesCaptured}/${category.pageCount} captured`);
      }
    }
    for (const product of [...FL_SALE_PRODUCTS, ...FL_ALSO_PRODUCTS]) {
      expect(resolveFlSlug(product.href.slice(1))?.kind).toBe("product");
    }
  });

  it("only advertises arithmetically valid discounted products", () => {
    const specials = flDiscountedProducts();
    expect(specials.length).toBeGreaterThan(300);
    expect(specials.length).toBeLessThan(423);
    expect(specials.every(flHasVerifiedDiscount)).toBe(true);
    expect(flHasVerifiedDiscount(FL_CATALOG.products.find((p) => p.slug === "wave-heels-25847")!)).toBe(false);
  });
});
