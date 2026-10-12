import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const VISITOR_COOKIE = "cansoria_visitor";
export const VISITOR_MAX_AGE = 30 * 86400;
export const VISITOR_PROOF_HEADER = "x-cansoria-visitor-proof";

function secret(): string {
  const key = process.env.STORE_VISITOR_SECRET || "";
  if (key.length < 32 || /supersecret|replace|changeme|your[_-]|example/i.test(key))
    throw new Error("A strong STORE_VISITOR_SECRET is required");
  return key;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function issueVisitorCookie(now = Math.floor(Date.now() / 1000)): string {
  const payload = `v1.${randomBytes(16).toString("hex")}.${now + VISITOR_MAX_AGE}`;
  return `${payload}.${sign(`cansoria:cookie\n${payload}`)}`;
}

export function readVisitorCookie(cookie: string | undefined, now = Math.floor(Date.now() / 1000)): string | undefined {
  if (!cookie || cookie.length > 160) return undefined;
  const match = /^v1\.([a-f0-9]{32})\.([0-9]{1,12})\.([a-f0-9]{64})$/.exec(cookie);
  if (!match) return undefined;
  const expiry = Number(match[2]);
  if (expiry <= now || expiry > now + VISITOR_MAX_AGE) return undefined;
  const payload = cookie.slice(0, cookie.lastIndexOf("."));
  const expected = sign(`cansoria:cookie\n${payload}`);
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(expected, "hex")) ? match[1] : undefined;
}

export function visitorRequestProof(id: string, method: string, path: string, now = Math.floor(Date.now() / 1000)): string {
  const payload = `v1.${id}.${now}`;
  return `${payload}.${sign(`cansoria:request\n${payload}\n${method}\n${path}`)}`;
}
