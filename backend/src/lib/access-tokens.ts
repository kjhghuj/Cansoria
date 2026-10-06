import { createHmac, timingSafeEqual } from "crypto"

type Purpose = "cart" | "order"
const ID_PATTERN = /^(cart|order)_[a-zA-Z0-9_-]{1,128}$/

export function signingSecret(): string {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "supersecret")
  if (process.env.NODE_ENV === "production" && (secret.length < 32 || /supersecret|replace|changeme|your[_-]|example/i.test(secret))) {
    throw new Error("A strong JWT_SECRET is required")
  }
  return secret
}

export function storefrontUrl(): string {
  const configured = process.env.STOREFRONT_URL || process.env.FRONTEND_URL
  if (process.env.NODE_ENV === "production" && !configured) throw new Error("A production storefront URL is required")
  const url = new URL(configured || "http://localhost:3030")
  if (url.username || url.password || !["http:", "https:"].includes(url.protocol) || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("A valid HTTPS storefront URL without credentials is required")
  return url.origin
}

/** Purpose-bound capabilities are only delivered through trusted cookies or email. */
export function issueAccessToken(purpose: Purpose, id: string, ttlSeconds = purpose === "cart" ? 604800 : 900, now = Math.floor(Date.now() / 1000)): string {
  if (!ID_PATTERN.test(id) || !id.startsWith(`${purpose}_`) || !Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 604800) {
    throw new Error("Invalid capability subject or lifetime")
  }
  const payload = Buffer.from(JSON.stringify({ v: 1, purpose, id, exp: now + ttlSeconds })).toString("base64url")
  const signature = createHmac("sha256", signingSecret()).update(`v1.${payload}`).digest("base64url")
  return `v1.${payload}.${signature}`
}

export function verifyAccessToken(token: unknown, purpose: Purpose, id: string, now = Math.floor(Date.now() / 1000)): boolean {
  if (typeof token !== "string" || token.length > 1024 || !ID_PATTERN.test(id)) return false
  const parts = token.split(".")
  if (parts.length !== 3 || parts[0] !== "v1" || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return false
  try {
    const expected = createHmac("sha256", signingSecret()).update(`v1.${parts[1]}`).digest()
    const actual = Buffer.from(parts[2], "base64url")
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return payload.v === 1 && payload.purpose === purpose && payload.id === id && Number.isSafeInteger(payload.exp) && payload.exp > now && payload.exp <= now + 604800
  } catch {
    return false
  }
}

export function orderAccessUrl(orderId: string): string {
  const url = new URL("/order/lookup", storefrontUrl())
  url.searchParams.set("order", orderId)
  url.searchParams.set("token", issueAccessToken("order", orderId))
  return url.toString()
}
