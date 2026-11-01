import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/security-policy";
import legacyMap from "@/data/florencess-legacy-map.json";

type LegacyMap = {
  products: Record<string, string>;
  categories: Record<string, string>;
};

const LEGACY = legacyMap as unknown as LegacyMap;
const knownSeoSlugs = new Set([
  ...Object.values(LEGACY.products),
  ...Object.values(LEGACY.categories),
]);
const staticHtmlAliases = new Set([
  "about-us", "shipping-policy", "terms-conditions", "privacy-policy", "cookie-policy",
  "careers", "affiliate-program", "customer-rewards-program", "payment-options",
  "returns-exchanges", "order-tracking", "faq", "contact", "brands", "special", "search",
  "wishlist",
]);

/**
 * OpenCart route names that map onto a page this storefront actually serves.
 * Routes without a destination are deliberately absent so they fall through to
 * the normal 404 instead of redirecting somewhere unrelated.
 */
const ROUTE_TARGETS: Record<string, string> = {
  "common/home": "/",
  "product/special": "/special",
  "product/manufacturer": "/brands",
  "product/search": "/search",
  "information/contact": "/contact",
  "checkout/cart": "/cart",
  "checkout/checkout": "/checkout",
  "account/login": "/account/login",
  "account/register": "/register",
  "account/account": "/account",
};

function legacyRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;

  // Account aliases: anonymous visitors enter the existing login surface while
  // retaining a strictly internal destination. These are checked before the
  // generic .html rule so legacy account pages do not fall through to /[slug].
  // /wishlist.html is NOT here: it 308s to the public /wishlist page.
  const accountAlias: Record<string, string> = {
    "/login.html": "/account/login",
    "/my-account.html": "/account/login",
    "/address-book.html": "/account/login",
    "/account-voucher.html": "/account/login",
    "/order-history.html": "/account/login",
  };
  if (accountAlias[pathname]) {
    const target = new URL(request.nextUrl);
    target.pathname = accountAlias[pathname];
    target.search = "";
    const returnTo =
      pathname === "/address-book.html"
        ? "/account?tab=addresses"
        : pathname === "/account-voucher.html"
          ? "/account?tab=coupons"
          : pathname === "/order-history.html"
            ? "/account?tab=orders"
            : "/account";
    target.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(target, 302);
  }

  // 1. Static-page alias: /about-us.html -> /about-us
  if (pathname.length > 5 && pathname.endsWith(".html")) {
    const slug = pathname.slice(1, -5);
    if (!staticHtmlAliases.has(slug) && !knownSeoSlugs.has(slug)) return null;
    const target = new URL(request.nextUrl);
    target.pathname = `/${slug}`;
    return NextResponse.redirect(target, 308);
  }

  if (pathname !== "/index.php" && pathname !== "/index.html") return null;

  const route = searchParams.get("route");
  if (route === "account/wishlist") {
    const target = new URL(request.nextUrl);
    target.pathname = "/wishlist";
    target.search = "";
    return NextResponse.redirect(target, 308);
  }
  if (!route) {
    const home = new URL(request.nextUrl);
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home, 308);
  }

  const target = new URL(request.nextUrl);
  target.search = "";

  if (route === "product/product") {
    const id = searchParams.get("product_id") || "";
    const slug = Object.hasOwn(LEGACY.products, id) ? LEGACY.products[id] : undefined;
    if (!slug) return null;
    target.pathname = `/${slug}`;
    return NextResponse.redirect(target, 308);
  }

  if (route === "product/category") {
    const pathParam = searchParams.get("path") || "";
    const slug = Object.hasOwn(LEGACY.categories, pathParam)
      ? LEGACY.categories[pathParam]
      : undefined;
    if (!slug) return null;
    target.pathname = `/${slug}`;
    // Listing filters survive the hop when they are parameters we support.
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    if (page) target.searchParams.set("page", page);
    if (limit) target.searchParams.set("limit", limit);
    return NextResponse.redirect(target, 308);
  }

  if (route === "product/search") {
    target.pathname = "/search";
    const term = searchParams.get("search") || searchParams.get("q") || "";
    if (term) target.searchParams.set("q", term);
    if (searchParams.get("description")) target.searchParams.set("description", "1");
  } else {
    const destination = ROUTE_TARGETS[route];
    if (!destination) return null;
    target.pathname = destination;
  }

  return NextResponse.redirect(target, 308);
}

export function proxy(request: NextRequest) {
  const redirect = legacyRedirect(request);
  if (redirect) return redirect;

  const nonce = randomBytes(16).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  // Dynamic product/article slugs may contain dots; only exclude actual platform assets.
  matcher: ["/((?!api(?:/|$)|_next/static/|_next/image(?:/|$)|favicon\\.ico$).*)"],
};
