import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SearchOverlay from "@/components/SearchOverlay";
import { portraitStyles, portraitUrl } from "../portrait";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

it("offers four accessible style shortcuts in the search overlay", () => {
  const html = renderToStaticMarkup(createElement(SearchOverlay, { isOpen: true, onClose: jest.fn() }));
  expect(html).toContain("Portrait Styles");
  expect(html).toContain('aria-label="Search products and stories"');
  expect(html).not.toMatch(/Popular Categories|\/shop|category=/);
  expect(html.match(/<a /g)).toHaveLength(4);
  for (const style of portraitStyles) {
    expect(html).toContain(`href="${portraitUrl}?style=${style.id}"`);
    expect(html).toContain(`aria-label="Explore ${style.name}, style illustration"`);
    expect(html).toContain(style.name);
    expect(html).toContain(encodeURIComponent(`/images/pet-oil/${style.id}.webp`));
  }
});
