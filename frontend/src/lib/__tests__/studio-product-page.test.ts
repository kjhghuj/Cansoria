import { Children, isValidElement, type ReactNode } from "react";
import type { StoreProduct } from "../types";
import { getProductByHandle, getRegion } from "../medusa";
import ProductPage, { generateMetadata } from "@/app/product/[handle]/page";
import { STUDIO } from "../studio-content";
import { portraitStyles } from "../portrait";
import ProductClient from "@/app/product/[handle]/components/ProductClient";
jest.mock("../medusa", () => ({
  ...jest.requireActual("../medusa"),
  getProductByHandle: jest.fn(),
  getRegion: jest.fn(),
}));
jest.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nonce": "unit-test-nonce" }),
}));
const legacy = {
  id: "prod_legacy",
  handle: "pet-portrait-oil-painting",
  title: "Pet Portrait",
  subtitle: "Museum-grade materials",
  description: "Master artists on archival linen with unlimited revisions.",
  images: [{ url: "/images/pet-oil/artist-at-work.webp" }],
  metadata: { story_sections: [{ id: "old", title: "Our master artists" }] },
  variants: [
    { id: "variant_1", calculated_price: { calculated_amount: 85.02 } },
  ],
} as unknown as StoreProduct;
const props = () => ({
  params: Promise.resolve({ handle: "pet-portrait-oil-painting" }),
  searchParams: Promise.resolve({ style: "dark-classic" }),
});
function findJsonLd(node: ReactNode): Record<string, unknown> | undefined {
  if (
    !isValidElement<{
      children?: ReactNode;
      dangerouslySetInnerHTML?: { __html: string };
    }>(node)
  )
    return undefined;
  if (node.type === "script" && node.props.dangerouslySetInnerHTML)
    return JSON.parse(node.props.dangerouslySetInnerHTML.__html);
  let found: Record<string, unknown> | undefined;
  Children.forEach(node.props.children, (child) => {
    found ??= findJsonLd(child);
  });
  return found;
}
function findInitialStyle(node: ReactNode): string | undefined {
  if (!isValidElement<{ children?: ReactNode; initialStyle?: string }>(node)) return undefined;
  if (node.type === ProductClient) return node.props.initialStyle;
  let found: string | undefined;
  Children.forEach(node.props.children, (child) => { found ??= findInitialStyle(child); });
  return found;
}
describe("actual product route presentation", () => {
  beforeEach(() => {
    jest.mocked(getProductByHandle).mockResolvedValue(legacy);
    jest
      .mocked(getRegion)
      .mockResolvedValue({ id: "reg_test", currency_code: "gbp" } as never);
  });
  it("does not inherit unverified catalog copy in the route metadata", async () => {
    const metadata = await generateMetadata(props());
    expect(metadata.description).toBe(STUDIO.productDescription);
    expect(metadata.alternates?.canonical).toBe(
      "/product/pet-portrait-oil-painting",
    );
    expect(JSON.stringify(metadata)).not.toMatch(
      /master artists|archival linen|unlimited revisions/i,
    );
  });
  it("keeps concept imagery and safe copy in JSON-LD without advertising an available sale", async () => {
    const data = findJsonLd(await ProductPage(props()));
    expect(data?.description).toBe(STUDIO.productDescription);
    expect(data?.image).toContain("/images/pet-oil/dark-classic.webp");
    expect(data?.offers).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(
      /artist-at-work|master artists|archival linen|unlimited revisions/i,
    );
  });
  it("handles a missing catalog product without fabricating product metadata", async () => {
    jest.mocked(getProductByHandle).mockResolvedValue(null);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe("Product Not Found | Cansoria");
    expect(metadata.description).not.toBe(STUDIO.productDescription);
  });
  it.each(portraitStyles)("preselects $name and its preview from the style link", async (style) => {
    const page = await ProductPage({
      params: props().params,
      searchParams: Promise.resolve({ style: style.id }),
    });
    expect(findInitialStyle(page)).toBe(style.id);
    expect(findJsonLd(page)?.image).toContain(`/images/pet-oil/${style.id}.webp`);
  });
  it("uses Classic Oil for an invalid style query", async () => {
    const page = await ProductPage({
      params: props().params,
      searchParams: Promise.resolve({ style: "unknown-style" }),
    });
    expect(findInitialStyle(page)).toBe("classic-oil");
  });
});
