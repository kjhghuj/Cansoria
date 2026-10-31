import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

function call(path: string) {
  return proxy(new NextRequest(new URL(path, "https://example.test")));
}

describe("FL compatibility redirects", () => {
  it("maps .html aliases to the extensionless route", () => {
    const response = call("/about-us.html");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://example.test/about-us");
  });

  it("maps account aliases to login with an internal return target", () => {
    const response = call("/wishlist.html");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.test/account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist",
    );
  });

  it("does not redirect unknown HTML suffixes or prototype-named ids", () => {
    expect(call("/unknown-product.html").headers.get("location")).toBeNull();
    expect(call("/index.php?route=product/product&product_id=toString").headers.get("location")).toBeNull();
    expect(call("/index.php?route=product/category&path=__proto__").headers.get("location")).toBeNull();
  });

  it("keeps the query string when dropping a .html suffix", () => {
    const response = call("/bags-all.html?page=2&limit=50");
    expect(response.headers.get("location")).toBe("https://example.test/bags-all?page=2&limit=50");
  });

  it("maps legacy OpenCart product ids that we captured", () => {
    const response = call("/index.php?route=product/product&product_id=45773");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://example.test/accordo-hobo-45773");
  });

  it("leaves unknown legacy ids and category paths to the normal 404", () => {
    expect(call("/index.php?route=product/product&product_id=99999999").headers.get("location")).toBeNull();
    expect(call("/index.php?route=product/category&path=99999999").headers.get("location")).toBeNull();
  });

  it("maps legacy wishlist via a restricted internal return target", () => {
    const result = call("/index.php?route=account/wishlist");
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(
      "https://example.test/account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist",
    );
  });

  it("routes legacy login to the account login surface", () => {
    expect(call("/index.php?route=account/login").headers.get("location")).toBe(
      "https://example.test/account/login",
    );
  });

  it("maps named legacy routes", () => {
    expect(call("/index.php?route=common/home").headers.get("location")).toBe("https://example.test/");
    expect(call("/index.php?route=product/special").headers.get("location")).toBe(
      "https://example.test/special",
    );
    expect(call("/index.php?route=information/contact").headers.get("location")).toBe(
      "https://example.test/contact",
    );
    expect(call("/index.php?route=product/search&search=bag").headers.get("location")).toBe(
      "https://example.test/search?q=bag",
    );
  });

  it("falls through to a normal response for a real page", () => {
    const response = call("/bags-all");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).toContain("nonce-");
  });
});
