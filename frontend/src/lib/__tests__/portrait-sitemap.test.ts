import sitemap from "@/app/sitemap";
import nextConfig from "../../../next.config";
import { getProducts, getRegion, getCategories } from "../medusa";
import { getArticles } from "../cms";

jest.mock("../medusa", () => ({
  getRegion: jest.fn(),
  getProducts: jest.fn(),
  getCategories: jest.fn(),
}));
jest.mock("../cms", () => ({ getArticles: jest.fn() }));

describe("portrait page consolidation routes", () => {
  it("retains content and product sitemap routes without listing the old shop or anchors", async () => {
    jest.mocked(getRegion).mockResolvedValue({ id: "reg_test" } as never);
    jest.mocked(getProducts).mockResolvedValue({ products: [{ handle: "pet-portrait-oil-painting", updated_at: "2026-01-01" }] } as never);
    jest.mocked(getArticles).mockResolvedValue([{ slug: "photo-guide", date: "2026-01-01" }] as never);
    const routes = await sitemap();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";
    const urls = routes.map((route) => route.url);
    expect(urls).toEqual(expect.arrayContaining([
      baseUrl,
      baseUrl + "/product/pet-portrait-oil-painting",
      baseUrl + "/journal/photo-guide",
      baseUrl + "/gallery",
      baseUrl + "/our-studio",
    ]));
    expect(urls.some((url) => /\/shop|category=|#styles/.test(url))).toBe(false);
    expect(getCategories).not.toHaveBeenCalled();
    expect(getProducts).toHaveBeenCalledWith("reg_test", 1000);
  });

  it("permanently redirects the legacy shop to the home styles", async () => {
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toContainEqual({ source: "/shop", destination: "/#styles", permanent: true });
  });
});
