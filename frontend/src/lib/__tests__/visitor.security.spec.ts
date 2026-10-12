import { createHmac } from "node:crypto";
import { issueVisitorCookie, readVisitorCookie, visitorRequestProof } from "../server-visitor";

const previous = process.env.STORE_VISITOR_SECRET;
beforeEach(() => { process.env.STORE_VISITOR_SECRET = "visitor-test-secret-".repeat(4); });
afterEach(() => { if (previous === undefined) delete process.env.STORE_VISITOR_SECRET; else process.env.STORE_VISITOR_SECRET = previous; });

describe("server-issued visitor identity", () => {
  it("issues unique signed cookies and reuses only valid identities", () => {
    const a = issueVisitorCookie(), b = issueVisitorCookie();
    expect(a).not.toBe(b);
    expect(readVisitorCookie(a)).toMatch(/^[a-f0-9]{32}$/);
    expect(readVisitorCookie(b)).not.toBe(readVisitorCookie(a));
  });
  it("rejects tampered, malformed, expired and overlong cookies", () => {
    const cookie = issueVisitorCookie(1000);
    expect(readVisitorCookie(cookie, 1001)).toBeDefined();
    expect(readVisitorCookie(cookie, 1000 + 30 * 86400)).toBeUndefined();
    expect(readVisitorCookie(cookie.slice(0, -1) + "z", 1001)).toBeUndefined();
    expect(readVisitorCookie("forged")).toBeUndefined();
    expect(readVisitorCookie("x".repeat(5000))).toBeUndefined();
    expect(readVisitorCookie(undefined)).toBeUndefined();
  });
  it("signs the actual method and exact upstream path with a separate request domain", () => {
    const id = "a".repeat(32), path = "/store/carts?fields=id", method = "POST", time = 123;
    const payload = `v1.${id}.${time}`;
    const mac = createHmac("sha256", process.env.STORE_VISITOR_SECRET!).update(`cansoria:request\n${payload}\n${method}\n${path}`).digest("hex");
    expect(visitorRequestProof(id, method, path, time)).toBe(`${payload}.${mac}`);
    expect(visitorRequestProof(id, "GET", path, time)).not.toBe(`${payload}.${mac}`);
  });
  it.each([undefined, "short", "replace_with_secure_random_hex_123456789"])('fails closed for absent or weak signing keys %s', key => {
    if (key === undefined) delete process.env.STORE_VISITOR_SECRET; else process.env.STORE_VISITOR_SECRET = key;
    expect(() => issueVisitorCookie()).toThrow("STORE_VISITOR_SECRET");
  });
});
