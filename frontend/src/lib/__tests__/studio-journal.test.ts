import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InlineProductBlock from "@/components/journal/InlineProductBlock";
import type { StoreProduct } from "../types";
describe("journal concept product cards", () => {
  it("shows the catalog currency, a concept image and its label", () => {
    const product = {
      id: "prod_test",
      title: "Pet Portrait",
      handle: "pet-portrait-oil-painting",
      thumbnail: "/images/pet-oil/artist-at-work.webp",
      variants: [
        {
          calculated_price: { calculated_amount: 85.02, currency_code: "eur" },
        },
      ],
    } as unknown as StoreProduct;
    const html = renderToStaticMarkup(
      createElement(InlineProductBlock, { product }),
    );
    expect(html).toContain("€85.02");
    expect(html).not.toContain("$85.02");
    expect(html).toContain("Style illustration");
    expect(html).not.toContain("artist-at-work");
  });
  it("does not invent a free price when a catalog item has no calculated price", () => {
    const product = {
      id: "prod_test",
      title: "Portrait Concept",
      handle: "generic",
      variants: [],
    } as unknown as StoreProduct;
    const html = renderToStaticMarkup(
      createElement(InlineProductBlock, { product }),
    );
    expect(html).toContain("Contact for Price");
    expect(html).not.toContain("£0.00");
    expect(html).not.toContain('src=""');
  });
});
