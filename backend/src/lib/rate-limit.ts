import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { createHash } from "crypto"
import { isIP } from "net"
import Redis from "ioredis"

type Policy = { name: string; limit: number; windowSeconds: number; global?: boolean; consume?: (key: string, ttl: number) => Promise<number> }
const memory = new Map<string, { count: number; expires: number }>()
let redis: Redis | undefined
let connecting: Promise<void> | undefined
const script = "local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c"

export function clientAddress(req: MedusaRequest): string {
  // Only an explicitly configured direct proxy may supply its single replacement IP header.
  const peer = req.socket?.remoteAddress || "unknown"
  const trusted = (process.env.TRUSTED_PROXY_IPS || "").split(",").map(x => x.trim()).filter(Boolean)
  if (trusted.includes(peer)) {
    const header = req.headers["x-real-ip"]
    if (typeof header === "string" && isIP(header)) return header
  }
  return peer
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
  if (process.env.NODE_ENV === "production") throw new Error("Shared rate limit unavailable")
  const now = Date.now(), current = memory.get(key)
  if (!current || current.expires <= now) {
    if (memory.size > 10000) for (const [entryKey, entry] of memory) if (entry.expires <= now) memory.delete(entryKey)
    if (memory.size > 10000) throw new Error("Rate limit capacity reached")
    memory.set(key, { count: 1, expires: now + ttl * 1000 })
    return 1
  }
  return ++current.count
}

export function createRateLimiter(policy: Policy) {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const identity = policy.global ? "global" : createHash("sha256").update(clientAddress(req)).digest("hex")
    try {
      const count = await (policy.consume || consume)(`cansoria:rate:${policy.name}:${identity}`, policy.windowSeconds)
      if (count > policy.limit) {
        res.setHeader("Retry-After", String(policy.windowSeconds))
        res.setHeader("Cache-Control", "no-store")
        return res.status(429).json({ type: "rate_limited", message: "Too many requests. Please try again later." })
      }
      return next()
    } catch {
      return res.status(503).json({ type: "unavailable", message: "Please try again later." })
    }
  }
}
