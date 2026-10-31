import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { flBrandListing } from "../florencess-brands";

const root = path.resolve(__dirname, "../../../..");
const generator = path.join(root, "tools/florencess-ref/pipeline/brand-manifest.mjs");
const manifestPath = path.join(root, "frontend/src/data/florencess-brand-manifest.json");

describe("manufacturer capture provenance", () => {
  it("rebuilds the exact checked-in offline manifest without network access", () => {
    const source = fs.readFileSync(manifestPath, "utf8");
    execFileSync(process.execPath, [generator, "--check"], { cwd: root });
    expect(fs.readFileSync(manifestPath, "utf8")).toBe(source);
  });

  it("ignores sidebar recommendations and rejects inconsistent manufacturer identity", () => {
    const fixture = `<html class="route-product-manufacturer-info manufacturer-108"><link href="https://entntnt.com/index.php?route=product/manufacturer/info&amp;manufacturer_id=108" rel="canonical"><div data-product-id="999"><div class="main-products main-products-style product-grid"><div class="product-layout" data-product-id="123"></div></div><div class="row pagination-results">Showing 1 to 1 of 4 (4 Pages)</div>`;
    const script = `import { extractBrandPage } from ${JSON.stringify(pathToFileURL(generator).href)}; const page = extractBrandPage(${JSON.stringify(fixture)}, "brand-clothing.html"); console.log(JSON.stringify({slug:page.slug, ids:page.productIds, total:page.sourceTotal}));`;
    expect(JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" }))).toEqual({slug:"manufacturer-108", ids:["123"], total:4});
  });

  it("uses the manufacturer ID and explicit first-page product IDs, not product names", () => {
    const clothing = flBrandListing("manufacturer-108");
    expect(clothing).toMatchObject({ manufacturerId: "108", sourceTotal: 746, sourcePages: 16, capturedPage: 1 });
    expect(clothing?.productIds).toHaveLength(48);
    expect(clothing?.productIds.slice(0, 2)).toEqual(["85656", "85970"]);
    expect(clothing?.products.map((product) => product.id)).toEqual(clothing?.localProductIds);
    expect(clothing?.products.length).toBe(48);
  });

  it("distinguishes an explicitly empty capture from a brand with unknown membership", () => {
    expect(flBrandListing("brand-adidas")?.sourceTotal).toBe(0);
    expect(flBrandListing("brand-gucci")?.sourceTotal).toBe(0);
    expect(flBrandListing("brand-nike")).toBeUndefined();
    expect(flBrandListing("brand-clothing")).toBeUndefined();
  });
});
