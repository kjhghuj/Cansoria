import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InlineProductBlock from "@/components/journal/InlineProductBlock";
import type { StoreProduct } from "../types";
describe("journal concept product cards", () => {
  it("shows the catalog currency, a concept image and its label", () => {
    const product = {
      id: "prod_test",
      title: "Meridian Automatic",
      handle: "meridian-automatic",
      thumbnail: "/images/watches/meridian-automatic.svg",
      variants: [
        {
          calculated_price: { calculated_amount: 334.62, currency_code: "eur" },
        },
      ],
    } as unknown as StoreProduct;
    const html = renderToStaticMarkup(
      createElement(InlineProductBlock, { product }),
    );
    expect(html).toContain("€334.62");
    expect(html).not.toContain("$334.62");
    expect(html).toContain("Collection illustration");
    expect(html).not.toContain("artist-at-work");
  });
  it("does not invent a free price when a catalog item has no calculated price", () => {
    const product = {
      id: "prod_test",
      title: "Watch Concept",
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
