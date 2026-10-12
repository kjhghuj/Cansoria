import type { MedusaRequest } from "@medusajs/framework/http"
import { createHmac, timingSafeEqual } from "crypto"

export class InvalidVisitorProof extends Error {}

export function visitorSigningSecret(): string {
  const key = process.env.STORE_VISITOR_SECRET || ""
  if (key.length < 32 || /supersecret|replace|changeme|your[_-]|example/i.test(key))
    throw new Error("A strong STORE_VISITOR_SECRET is required")
  return key
}

/** A cookie is never accepted here: only the BFF can mint a short-lived request proof. */
export function verifiedVisitor(req: MedusaRequest): string | undefined {
  const header = req.headers["x-cansoria-visitor-proof"]
  if (header === undefined) return undefined
  const secret = visitorSigningSecret()
  if (typeof header !== "string" || header.length > 160) throw new InvalidVisitorProof()
  const match = /^v1\.([a-f0-9]{32})\.([0-9]{1,12})\.([a-f0-9]{64})$/.exec(header)
  if (!match) throw new InvalidVisitorProof()
  const now = Math.floor(Date.now() / 1000), issued = Number(match[2])
  if (issued < now - 60 || issued > now + 5) throw new InvalidVisitorProof()
  const payload = header.slice(0, header.lastIndexOf("."))
  const path = req.originalUrl || req.url
  if (!path || !req.method) throw new InvalidVisitorProof()
  const expected = createHmac("sha256", secret).update(`cansoria:request\n${payload}\n${req.method.toUpperCase()}\n${path}`).digest()
  if (!timingSafeEqual(Buffer.from(match[3], "hex"), expected)) throw new InvalidVisitorProof()
  return match[1]
}
