const DEFAULT_ASSET_ORIGINS = ["https://images.unsplash.com", "https://videos.pexels.com"];

function configuredOrigin(value: string, production: boolean): string | undefined {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hostname.includes("*")) return undefined;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !production)) return undefined;
    const hostname = url.hostname.toLowerCase();
    if (production && (hostname === "localhost" || hostname.endsWith(".localhost") || /^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname === "[::1]" || hostname === "[::]")) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function assetOrigins(): string[] {
  const production = process.env.NODE_ENV === "production";
  const configured = process.env.NEXT_PUBLIC_ASSET_ORIGINS?.split(",") ?? DEFAULT_ASSET_ORIGINS;
  const candidates = [
    ...configured,
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
    process.env.STRAPI_API_URL,
    ...(!production ? ["http://localhost:9030", "http://127.0.0.1:9030", "http://localhost:1337"] : []),
  ];
  return [...new Set(candidates.flatMap(value => {
    const origin = value ? configuredOrigin(value.trim(), production) : undefined;
    return origin ? [origin] : [];
  }))];
}

export function contentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV === "development";
  const origins = assetOrigins().join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://challenges.cloudflare.com${development ? " 'unsafe-eval'" : ""}`,
    // Existing React components and Stripe Elements use inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${origins} https://*.stripe.com`,
    `media-src 'self' ${origins}`,
    "font-src 'self'",
    `connect-src 'self' ${origins} https://api.stripe.com https://*.stripe.com https://*.stripe.network https://challenges.cloudflare.com${development ? " ws: wss:" : ""}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.network https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
