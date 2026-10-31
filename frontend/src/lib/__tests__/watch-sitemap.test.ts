import sitemap from "@/app/sitemap";
import nextConfig from "../../../next.config";
import { getProducts, getRegion, getCategories } from "../medusa";
import { resolveJournalArticles } from "../cms";

jest.mock("../medusa", () => ({
  getRegion: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
}));
jest.mock("../cms", () => ({ resolveJournalArticles: jest.fn() }));

describe("watch storefront sitemap routes", () => {
  it("retains content and product sitemap routes without listing the old shop or anchors", async () => {
    jest.mocked(getRegion).mockResolvedValue({ id: "reg_test" } as never);
    jest.mocked(getProducts).mockResolvedValue({ products: [{ handle: "meridian-automatic", updated_at: "2026-01-01" }] } as never);
    jest.mocked(resolveJournalArticles).mockResolvedValue({ articles: [{ slug: "buying-guide", date: "2026-01-01" }], source: "static" } as never);
    const routes = await sitemap();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com";
    const urls = routes.map((route) => route.url);
    expect(urls).toEqual(expect.arrayContaining([
      baseUrl,
      baseUrl + "/product/meridian-automatic",
      baseUrl + "/journal/buying-guide",
      baseUrl + "/gallery",
      baseUrl + "/our-studio",
    ]));
    expect(urls).toContain(baseUrl + "/shop");
    expect(urls).toContain(baseUrl + "/bags-all");
    expect(urls).toContain(baseUrl + "/careers");
    expect(urls).toContain(baseUrl + "/accordo-hobo-45773");
    expect(urls).toContain(baseUrl + "/manufacturer-108");
    expect(urls).not.toContain(baseUrl + "/brand-adidas");
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.some((url) => /\/login|\/cart|\/checkout|\/search(?:\?|$)/.test(url))).toBe(false);
    expect(urls.some((url) => /category=|#styles|#collections|\/upload-photo/.test(url))).toBe(false);
    expect(getCategories).not.toHaveBeenCalled();
    expect(getProducts).toHaveBeenCalledWith("reg_test", 1000);
  });

  it("stamps static routes with the fixed content revision date, not build time", async () => {
    jest.mocked(getRegion).mockResolvedValue({ id: "reg_test" } as never);
    jest.mocked(getProducts).mockResolvedValue({ products: [] } as never);
    jest.mocked(resolveJournalArticles).mockResolvedValue({ articles: [] } as never);
    const before = new Date();
    const routes = await sitemap();
    const home = routes.find((route) => route.url === (process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com"));
    const buildTime = new Date();
    // The static lastmod must be a real fixed date in the past, not "now".
    const lastModified = home?.lastModified as Date;
    expect(lastModified).toEqual(new Date("2026-10-21"));
    expect(lastModified.getTime()).toBeLessThan(before.getTime());
    expect(lastModified.getTime()).toBeLessThan(buildTime.getTime());
  });

  it("no longer redirects /shop now that it is a real listing page", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects.some((entry) => entry.source === "/shop")).toBe(false);
  });
});
