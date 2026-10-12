import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { createHash } from "crypto"
import { isIP } from "net"
import Redis from "ioredis"
import { isLocalDevelopment } from "./env-mode"
import { InvalidVisitorProof, verifiedVisitor } from "./visitor-identity"

type Policy = { name: string; limit: number; windowSeconds: number; global?: boolean; globalLimit?: number; consume?: (key: string, ttl: number) => Promise<number> }
const memory = new Map<string, { count: number; expires: number }>()
let redis: Redis | undefined
let connecting: Promise<void> | undefined
const script = "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c"

function canonicalAddress(address: string): string {
  if (/^::ffff:/i.test(address) && isIP(address.slice(7)) === 4) return address.slice(7)
  if (isIP(address) === 6) return new URL(`http://[${address}]`).hostname.slice(1, -1)
  return address
}

function trustedClientAddress(req: MedusaRequest): string | undefined {
  // Only an explicitly configured direct proxy may supply its single replacement IP header.
  const peer = canonicalAddress(req.socket?.remoteAddress || "unknown")
  const trusted = (process.env.TRUSTED_PROXY_IPS || "").split(",").map(x => canonicalAddress(x.trim())).filter(Boolean)
  if (trusted.includes(peer)) {
    const header = req.headers["x-real-ip"]
    if (typeof header === "string" && isIP(header)) return canonicalAddress(header)
  }
  return undefined
}

export function clientAddress(req: MedusaRequest): string {
  return trustedClientAddress(req) || canonicalAddress(req.socket?.remoteAddress || "unknown")
}

async function consume(key: string, ttl: number): Promise<number> {
  if (process.env.REDIS_URL) {
    if (!redis || redis.status === "end") {
      redis?.disconnect()
      redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: false, connectTimeout: 2000, commandTimeout: 2000, connectionName: `cansoria-backend-rate-${process.pid}`, retryStrategy: () => null })
      redis.on("error", () => {})
    }
    if (redis.status !== "ready") {
      connecting ||= redis.connect().finally(() => { connecting = undefined })
      await connecting
    }
    return Number(await redis.eval(script, 1, key, ttl))
  }
  if (!isLocalDevelopment()) throw new Error("Shared rate limit unavailable")
  const now = Date.now(), current = memory.get(key)
  if (!current || current.expires <= now) {
    if (memory.size >= 10000) for (const [entryKey, entry] of memory) if (entry.expires <= now) memory.delete(entryKey)
    if (memory.size >= 10000 && !current) throw new Error("Rate limit capacity reached")
    memory.set(key, { count: 1, expires: now + ttl * 1000 })
    return 1
  }
  return ++current.count
}

export function createRateLimiter(policy: Policy) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    try {
      const visitor = policy.global ? undefined : verifiedVisitor(req)
      const identity = policy.global ? "global" : createHash("sha256").update(
        trustedClientAddress(req) ? `ip:${trustedClientAddress(req)}` : visitor ? `visitor:${visitor}` : `ip:${clientAddress(req)}`
      ).digest("hex")
      const increment = policy.consume || consume
      const reject = () => {
        res.setHeader("Retry-After", String(policy.windowSeconds))
        res.setHeader("Cache-Control", "no-store")
        return res.status(429).json({ type: "rate_limited", message: "Too many requests. Please try again later." })
      }
      // A visitor can clear cookies. Bound aggregate traffic before allocating visitor keys.
      if (!policy.global && await increment(`cansoria:rate:${policy.name}:aggregate`, policy.windowSeconds) > (policy.globalLimit ?? policy.limit * 100)) return reject()
      const count = await increment(`cansoria:rate:${policy.name}:${identity}`, policy.windowSeconds)
      if (count > policy.limit) return reject()
      const auth = (req as Partial<AuthenticatedMedusaRequest>).auth_context
      const customer = auth?.actor_type === "customer" ? auth.actor_id : undefined
      if (!policy.global && customer) {
        const account = createHash("sha256").update(customer).digest("hex")
        if (await increment(`cansoria:rate:${policy.name}:customer:${account}`, policy.windowSeconds) > policy.limit) return reject()
      }
      return next()
    } catch (error) {
      res.setHeader("Cache-Control", "no-store")
      if (error instanceof InvalidVisitorProof) return res.status(403).json({ type: "not_allowed", message: "Access denied." })
      return res.status(503).json({ type: "unavailable", message: "Please try again later." })
    }
  }
}
