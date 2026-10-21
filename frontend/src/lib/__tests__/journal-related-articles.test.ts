type CmsModule = typeof import("../cms");

function loadCms(apiUrl: string | undefined): CmsModule {
  if (apiUrl === undefined) delete process.env.STRAPI_API_URL;
  else process.env.STRAPI_API_URL = apiUrl;
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../cms") as CmsModule;
}

const staticSlug = "automatic-vs-quartz-which-watch-movement-is-right-for-you";
const strapiArticle = (id: number) => ({ id, slug: `cms-${id}`, title: `CMS ${id}`, publishedAt: "2026-01-01", content: "<p>Body</p>" });
const jsonResponse = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("related articles content policy", () => {
  afterEach(() => {
    delete process.env.STRAPI_API_URL;
    delete (global as { fetch?: unknown }).fetch;
  });

  it("treats a CMS 404 as authoritative: a withdrawn related article stays gone", async () => {
    const cms = loadCms("https://cms.test");
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(404, { error: { status: 404, name: "NotFoundError" } })) as never;
    expect(await cms.getRelatedArticles([1])).toEqual([]);
  });

  it("falls back to the built-in article only when the CMS is unavailable", async () => {
    const cms = loadCms("https://cms.test");
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(503, {})) as never;
    const [serverError] = await cms.getRelatedArticles([1]);
    expect(serverError?.slug).toBe(staticSlug);

    global.fetch = jest.fn().mockRejectedValue(new Error("cms unreachable")) as never;
    const [networkError] = await cms.getRelatedArticles([1]);
    expect(networkError?.slug).toBe(staticSlug);
  });

  it("uses the static list directly in static mode without contacting a CMS", async () => {
    const cms = loadCms(undefined);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    const [fallback] = await cms.getRelatedArticles([1]);
    expect(fallback?.slug).toBe(staticSlug);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a healthy CMS hit and treats 200 with no data as missing", async () => {
    const cms = loadCms("https://cms.test");
    global.fetch = jest.fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: strapiArticle(7) }))
      .mockResolvedValueOnce(jsonResponse(200, { data: null })) as never;
    const [hit, miss] = await cms.getRelatedArticles([7, 8]);
    expect(hit?.slug).toBe("cms-7");
    expect(miss).toBeUndefined();
  });
});
