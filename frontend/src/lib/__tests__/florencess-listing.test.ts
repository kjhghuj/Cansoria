import {
  FL_DEFAULT_PAGE_SIZE,
  flListHref,
  paginateFl,
  parseFlListParams,
  sortFlProducts,
} from "../florencess-listing";
import { flHasVerifiedDiscount, flNumericPrice, type FlProduct } from "../florencess-catalog";

const product = (id: string, title: string, price: string, model: string): FlProduct => ({
  id,
  slug: `slug-${id}`,
  title,
  model,
  brand: "",
  description: "",
  price,
  oldPrice: "",
  discount: "",
  currency: "USD",
  availability: "InStock",
  options: [],
  localImages: [],
  pageCaptured: true,
});

describe("listing params", () => {
  it("defaults to page 1, default sort and 48 per page", () => {
    expect(parseFlListParams({})).toEqual({ page: 1, sort: "default", limit: FL_DEFAULT_PAGE_SIZE });
  });

  it("rejects values the reference controls do not offer", () => {
    expect(parseFlListParams({ sort: "bogus", limit: "7", page: "-3" })).toEqual({
      page: 1,
      sort: "default",
      limit: FL_DEFAULT_PAGE_SIZE,
    });
  });

  it("accepts every documented sort and page size", () => {
    expect(parseFlListParams({ sort: "price-desc", limit: "100", page: "3" })).toEqual({
      page: 3,
      sort: "price-desc",
      limit: 100,
    });
  });
});

describe("listing sort", () => {
  const items = [
    product("1", "Beta", "$20.00", "3"),
    product("2", "alpha", "$100.00", "1"),
    product("3", "Gamma", "$5.00", "2"),
  ];

  it("sorts by name, price and model in both directions", () => {
    expect(sortFlProducts(items, "name-asc").map((p) => p.title)).toEqual(["alpha", "Beta", "Gamma"]);
    expect(sortFlProducts(items, "name-desc").map((p) => p.title)).toEqual(["Gamma", "Beta", "alpha"]);
    expect(sortFlProducts(items, "price-asc").map((p) => p.id)).toEqual(["3", "1", "2"]);
    expect(sortFlProducts(items, "price-desc").map((p) => p.id)).toEqual(["2", "1", "3"]);
    expect(sortFlProducts(items, "model-asc").map((p) => p.id)).toEqual(["2", "3", "1"]);
    expect(sortFlProducts(items, "model-desc").map((p) => p.id)).toEqual(["1", "3", "2"]);
  });

  it("compares model identifiers as strings, not numerical quantities", () => {
    const models = [product("10", "A", "$1.00", "10"), product("2", "B", "$1.00", "2")];
    expect(sortFlProducts(models, "model-asc").map((item) => item.id)).toEqual(["10", "2"]);
  });

  it("keeps the capture order for default and for rating, which has no data", () => {
    expect(sortFlProducts(items, "default").map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(sortFlProducts(items, "rating-desc").map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(sortFlProducts(items, "rating-asc").map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("parses thousand separators without changing display amounts", () => {
    const expensive = product("5", "Expensive", "$1,200.00", "5");
    const cheaper = product("6", "Cheaper", "$900.00", "6");
    expect(flNumericPrice(expensive)).toBe(1200);
    expect(sortFlProducts([expensive, cheaper], "price-asc").map((p) => p.id)).toEqual(["6", "5"]);
    expect(flHasVerifiedDiscount({ ...expensive, oldPrice: "$1,500.00" })).toBe(true);
  });

  it("keeps products without a price last and never fabricates one", () => {
    const withMissing = [...items, product("4", "Delta", "", "4")];
    expect(sortFlProducts(withMissing, "price-asc").map((p) => p.id)).toEqual(["3", "1", "2", "4"]);
    expect(sortFlProducts(withMissing, "price-desc").map((p) => p.id)).toEqual(["2", "1", "3", "4"]);
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 210 }, (_, index) => product(String(index + 1), `P${index}`, "$1.00", "1"));

  it("reports the reference-style range for the first page", () => {
    expect(paginateFl(items, 1, 48)).toMatchObject({ page: 1, pageCount: 5, total: 210, from: 1, to: 48 });
  });

  it("clamps page zero, negative and past-the-end pages", () => {
    expect(paginateFl(items, 0, 48).page).toBe(1);
    expect(paginateFl(items, -4, 48).page).toBe(1);
    const last = paginateFl(items, 99, 48);
    expect(last.page).toBe(5);
    expect(last.to).toBe(210);
  });

  it("handles an empty result without inventing a page", () => {
    expect(paginateFl([], 3, 48)).toMatchObject({ page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });
});

describe("listing hrefs", () => {
  it("drops default params and keeps the rest", () => {
    expect(flListHref("/bags-all", { page: 1, sort: "default", limit: 48 })).toBe("/bags-all");
    expect(flListHref("/bags-all", { page: 2, sort: "price-asc", limit: 100 })).toBe(
      "/bags-all?page=2&sort=price-asc&limit=100",
    );
  });

  it("preserves search values while changing page", () => {
    expect(flListHref("/search", { q: "bag", category: "bags-all" }, { page: 2 })).toBe(
      "/search?q=bag&category=bags-all&page=2",
    );
  });
});
