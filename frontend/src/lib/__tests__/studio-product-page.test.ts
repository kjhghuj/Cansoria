import { Children, isValidElement, type ReactNode } from "react";
import type { StoreProduct } from "../types";
import { getProductByHandle, getRegion, getStoreOrdersOpen } from "../medusa";
import ProductPage, { generateMetadata } from "@/app/product/[handle]/page";
import { STUDIO, collectionsUrl } from "../studio-content";
jest.mock("../medusa", () => ({
  ...jest.requireActual("../medusa"),
  getProductByHandle: jest.fn(),
  getRegion: jest.fn(),
  getStoreOrdersOpen: jest.fn(),
}));
jest.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nonce": "unit-test-nonce" }),
}));
const legacy = {
  id: "prod_legacy",
  handle: "meridian-automatic",
  title: "Meridian Automatic",
  subtitle: "In-house assembly",
  description: "Chronometer-certified accuracy with unlimited servicing.",
  images: [{ url: "/images/watches/meridian-automatic.svg" }],
  metadata: { story_sections: [{ id: "old", title: "Our master watchmakers" }] },
  variants: [
    { id: "variant_1", calculated_price: { calculated_amount: 334.62 } },
  ],
} as unknown as StoreProduct;
const props = () => ({
  params: Promise.resolve({ handle: "meridian-automatic" }),
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
describe("actual product route presentation", () => {
  beforeEach(() => {
    jest.mocked(getProductByHandle).mockResolvedValue(legacy);
    jest
      .mocked(getRegion)
      .mockResolvedValue({ id: "reg_test", currency_code: "usd" } as never);
    jest.mocked(getStoreOrdersOpen).mockResolvedValue(false);
  });
  it("does not inherit unverified catalog copy in the route metadata", async () => {
    const metadata = await generateMetadata(props());
    expect(metadata.description).toBe(STUDIO.productDescription);
    expect(metadata.alternates?.canonical).toBe(
      "/product/meridian-automatic",
    );
    expect(JSON.stringify(metadata)).not.toMatch(
      /master watchmakers|chronometer-certified|unlimited servicing/i,
    );
  });
  it("presents reviewed admin copy once the store opens orders", async () => {
    jest.mocked(getStoreOrdersOpen).mockResolvedValue(true);
    const metadata = await generateMetadata(props());
    expect(metadata.description).toBe(legacy.description);
    const data = findJsonLd(await ProductPage(props()));
    expect(data?.description).toBe(legacy.description);
  });
  it("keeps product imagery and safe copy in JSON-LD without advertising an available sale", async () => {
    const data = findJsonLd(await ProductPage(props()));
    expect(data?.description).toBe(STUDIO.productDescription);
    expect(data?.image).toContain("/images/watches/meridian-automatic.svg");
    expect(data?.offers).toBeUndefined();
    expect(JSON.stringify(data)).not.toMatch(
      /master watchmakers|chronometer-certified|unlimited servicing/i,
    );
  });
  it("emits a BreadcrumbList that mirrors the visible Home / Watches / product trail", async () => {
    const page = await ProductPage(props());
    const scripts: unknown[] = [];
    (function collect(node: ReactNode) {
      if (!isValidElement<{ children?: ReactNode; dangerouslySetInnerHTML?: { __html: string } }>(node)) return;
      if (node.type === "script" && node.props.dangerouslySetInnerHTML)
        scripts.push(JSON.parse(node.props.dangerouslySetInnerHTML.__html));
      Children.forEach(node.props.children, collect);
    })(page);
    const breadcrumb = scripts.find(
      (entry) => (entry as { "@type"?: string })["@type"] === "BreadcrumbList",
    ) as
      | {
          itemListElement: { position: number; name: string; item: string }[];
        }
      | undefined;
    expect(breadcrumb?.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cansoria.com/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Watches",
        item: `https://cansoria.com${collectionsUrl}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Meridian Automatic",
        item: "https://cansoria.com/product/meridian-automatic",
      },
    ]);
  });
  it("handles a missing catalog product without fabricating product metadata", async () => {
    jest.mocked(getProductByHandle).mockResolvedValue(null as unknown as never);
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe("Product Not Found | Cansoria");
    expect(metadata.description).not.toBe(STUDIO.productDescription);
  });
});
