import { afterEach, describe, expect, it } from "@jest/globals";
import nextConfig from "../../../next.config";
import { NextRequest } from "next/server";
import { assetOrigins, contentSecurityPolicy } from "@/lib/security-policy";
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config as proxyConfig } from '../../proxy';

describe("asset and response security policy", () => {
  it('protects dynamic pages whose slugs look like static filenames', () => {
    for (const pathname of ['/journal/article.js', '/product/handle.svg', '/order/lookup']) {
      expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url: `https://shop.test${pathname}` })).toBe(true);
    }
    expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url: 'https://shop.test/_next/static/chunk.js' })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url: 'https://shop.test/api/auth/login' })).toBe(false);
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ASSET_ORIGINS;
  });

  it("has no blanket backend rewrite and disallows SVG optimization", () => {
    expect(nextConfig.rewrites).toBeUndefined();
    expect(nextConfig.images?.remotePatterns).not.toEqual(expect.arrayContaining([expect.objectContaining({ hostname: "**" })]));
    expect(nextConfig.images?.dangerouslyAllowSVG).toBe(false);
  });

  it("sets anti-framing, no-sniff, referrer and API cache headers", async () => {
    const configured = await nextConfig.headers!();
    const headers = configured.find(item => item.source === "/:path*")?.headers;
    expect(headers).toEqual(expect.arrayContaining([
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]));
    expect(configured.find(item => item.source === "/api/:path*")?.headers).toEqual(expect.arrayContaining([{ key: "Cache-Control", value: "no-store" }]));
  });

  it("generates a fresh nonce and replaces attacker-supplied nonce and CSP", async () => {
    const { proxy } = await import("@/proxy");
    const request = new NextRequest("https://cansoria.com/journal/sample", { headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src * 'unsafe-inline'" } });
    const first = proxy(request);
    const second = proxy(request);
    const csp = first.headers.get("Content-Security-Policy")!;
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("attacker");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    const nonce = first.headers.get("x-middleware-request-x-nonce");
    expect(nonce).toBeTruthy();
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
    expect(nonce).not.toBe(second.headers.get("x-middleware-request-x-nonce"));
    expect(first.headers.get("Cache-Control")).toContain("no-store");
  });

  it("only allows explicit HTTPS assets and rejects wildcard, credentials, and loopback in production", () => {
    const previous = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_ASSET_ORIGINS: "https://cdn.example.com/assets,https://**,https://user:pass@evil.example,http://localhost:9030,https://127.0.0.1,http://10.0.0.1,invalid" });
    try {
      const origins = assetOrigins();
      expect(origins).toContain("https://cdn.example.com");
      expect(origins).not.toEqual(expect.arrayContaining(["https://**", "http://localhost:9030", "https://127.0.0.1"]));
      const policy = contentSecurityPolicy("test-nonce");
      expect(policy).toContain("upgrade-insecure-requests");
      expect(policy).not.toContain("'unsafe-eval'");
      expect(policy).toContain("https://challenges.cloudflare.com");
      expect(policy).toContain("https://js.stripe.com");
    } finally {
      Object.assign(process.env, { NODE_ENV: previous });
    }
  });
});
