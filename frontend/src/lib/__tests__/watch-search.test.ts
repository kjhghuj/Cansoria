import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SearchOverlay from "@/components/SearchOverlay";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const watchHandles = [
  "heritage-classic-40",
  "northsea-diver",
  "regent-chronograph",
  "meridian-automatic",
];

it("offers four accessible collection shortcuts in the search overlay", () => {
  const html = renderToStaticMarkup(createElement(SearchOverlay, { isOpen: true, onClose: jest.fn() }));
  expect(html).toContain("Collections");
  expect(html).toContain('aria-label="Search products and stories"');
  expect(html).not.toMatch(/Popular Categories|category=/);
  expect(html.match(/<a /g)).toHaveLength(4);
  for (const handle of watchHandles) {
    expect(html).toContain(`href="/product/${handle}"`);
    expect(html).toContain(`/images/watches/${handle}.svg`);
  }
  const names = ["Dress", "Dive", "Chronograph", "Automatic"];
  for (const name of names) {
    expect(html).toContain(`aria-label="Explore ${name}, collection illustration"`);
    expect(html).toContain(`>${name}<`);
  }
});
