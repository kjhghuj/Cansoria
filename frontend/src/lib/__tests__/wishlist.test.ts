import { describe, expect, it } from "@jest/globals";
import {
  WISHLIST_KEY,
  WISHLIST_LIMIT,
  addItem,
  hasItem,
  mergeLists,
  parseWishlist,
  removeItem,
  type WishlistItem,
} from "@/lib/wishlist";

const item = (slug: string, overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  slug,
  title: `Item ${slug}`,
  image: "/img/a.jpg",
  price: "$10.00",
  addedAt: "2026-11-01T08:00:00.000Z",
  ...overrides,
});

describe("wishlist item operations", () => {
  it("adds new items at the front", () => {
    const list = addItem([item("b")], item("a"));
    expect(list.map((entry) => entry.slug)).toEqual(["a", "b"]);
  });

  it("re-adds an existing item by moving it to the front, not duplicating", () => {
    const list = addItem([item("a"), item("b")], item("a", { price: "$12.00" }));
    expect(list.map((entry) => entry.slug)).toEqual(["a", "b"]);
    expect(list[0].price).toBe("$12.00");
  });

  it("never mutates the input array", () => {
    const original = [item("a")];
    const next = addItem(original, item("b"));
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
  });

  it("caps the list at the documented limit, dropping the oldest", () => {
    let list: WishlistItem[] = [];
    for (let index = 0; index < WISHLIST_LIMIT + 10; index += 1) {
      list = addItem(list, item(`item-${index}`));
    }
    expect(list).toHaveLength(WISHLIST_LIMIT);
    expect(list[0].slug).toBe(`item-${WISHLIST_LIMIT + 9}`);
    expect(list.at(-1)?.slug).toBe("item-10");
  });

  it("removes by slug and reports membership", () => {
    const list = [item("a"), item("b")];
    expect(removeItem(list, "a").map((entry) => entry.slug)).toEqual(["b"]);
    expect(removeItem(list, "missing")).toEqual(list);
    expect(hasItem(list, "b")).toBe(true);
    expect(hasItem(list, "z")).toBe(false);
  });
});

describe("mergeLists", () => {
  it("puts the fresher list first and deduplicates by slug", () => {
    const guest = [item("a"), item("b")];
    const account = [item("b", { price: "$9.00" }), item("c")];
    const merged = mergeLists(guest, account);
    expect(merged.map((entry) => entry.slug)).toEqual(["a", "b", "c"]);
    expect(merged[1].price).toBe("$10.00");
  });

  it("respects the list limit", () => {
    const big = Array.from({ length: WISHLIST_LIMIT }, (_, index) => item(`l-${index}`));
    expect(mergeLists(big, [item("extra")])).toHaveLength(WISHLIST_LIMIT);
  });
});

describe("parseWishlist", () => {
  it("parses a well-formed saved list", () => {
    const parsed = parseWishlist(
      [{ slug: "nice-bag", title: "Nice Bag", image: "https://cdn.test/a.jpg", price: "$5.00", addedAt: "2026-11-01T08:00:00.000Z" }],
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].slug).toBe("nice-bag");
  });

  it("returns an empty list for non-array or junk input", () => {
    expect(parseWishlist(undefined)).toEqual([]);
    expect(parseWishlist(null)).toEqual([]);
    expect(parseWishlist("nope")).toEqual([]);
    expect(parseWishlist(42)).toEqual([]);
  });

  it("drops entries with missing or wrong-typed fields", () => {
    const parsed = parseWishlist([
      item("ok"),
      { slug: "no-title", image: "/a.jpg", price: "$1", addedAt: "2026-11-01T08:00:00.000Z" },
      { title: "missing slug entirely", image: "/a.jpg", price: "$1", addedAt: "2026-11-01T08:00:00.000Z" },
      { slug: "number-title", title: 7, image: "/a.jpg", price: "$1", addedAt: "2026-11-01T08:00:00.000Z" },
      "just a string",
      null,
    ]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["ok"]);
  });

  it("drops entries whose slug does not match the product-slug pattern", () => {
    const parsed = parseWishlist([
      item("UPPER-CASE"),
      item("has spaces"),
      item("../etc/passwd"),
      item("ok-lower-123"),
    ]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["ok-lower-123"]);
  });

  it("drops entries with hostile or oversized string fields", () => {
    const parsed = parseWishlist([
      item("a", { image: "javascript:alert(1)" }),
      item("b", { image: "data:text/html,evil" }),
      item("c", { title: "x".repeat(301) }),
      item("d", { price: "$1".repeat(40) }),
      item("e", { addedAt: "not-a-date" }),
      item("f", { addedAt: "2026-13-45T99:99:99.000Z" }),
    ]);
    expect(parsed).toEqual([]);
  });

  it("accepts local-backend image URLs on loopback hosts only", () => {
    const parsed = parseWishlist([
      item("dev-img", { image: "http://localhost:9030/static/a.jpg" }),
      item("dev-ip", { image: "http://127.0.0.1/static/b.png" }),
      item("remote-http", { image: "http://example.com/a.jpg" }),
      item("protocol-relative", { image: "//evil.com/a.jpg" }),
      item("data-uri", { image: "data:image/png;base64,xx" }),
    ]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["dev-img", "dev-ip"]);
  });

  it("accepts https and site-absolute image paths", () => {
    const parsed = parseWishlist([
      item("https-img", { image: "https://example.com/a.jpg" }),
      item("site-path", { image: "/florencess/img/a.webp" }),
    ]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["https-img", "site-path"]);
  });

  it("accepts entries without an image or a price", () => {
    const parsed = parseWishlist([
      item("no-image", { image: "" }),
      item("no-price", { price: "" }),
    ]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["no-image", "no-price"]);
  });

  it("parses legacy saved entries whose image was '/' without error", () => {
    const parsed = parseWishlist([item("legacy", { image: "/" })]);
    expect(parsed.map((entry) => entry.slug)).toEqual(["legacy"]);
  });

  it("reports rejected items instead of silently ignoring them", () => {
    const list = [item("kept")];
    const rejected = addItem(list, item("dropped", { image: "javascript:alert(1)" }));
    expect(rejected).toBe(list);
    expect(rejected.map((entry) => entry.slug)).toEqual(["kept"]);
  });

  it("exposes the storage key", () => {
    expect(WISHLIST_KEY).toBe("lorencess_wishlist");
  });
});
