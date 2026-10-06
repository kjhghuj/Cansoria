import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const generateContent = jest.fn<(...args: unknown[]) => Promise<{ text: string }>>();
jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn(() => ({ models: { generateContent } })) }));

describe("chat API abuse controls", () => {
  let post: (request: Request) => Promise<Response>;
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    delete process.env.CHAT_REDIS_URL;
    delete process.env.CHAT_TRUSTED_IP_HEADER;
    process.env.CHAT_DAILY_CALL_BUDGET = "500";
    generateContent.mockResolvedValue({ text: "Hello" });
    post = (await import("@/app/api/chat/route")).POST;
  });
  afterEach(() => { jest.useRealTimers(); });

  const request = (message: unknown, headers: Record<string, string> = {}) => new Request("https://cansoria.com/api/chat", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ message }) });

  it("rejects long, missing, malformed, and invalid messages before a paid call", async () => {
    for (const message of ["x".repeat(2001), " ".repeat(2001) + "hi", null, 123, "   "]) {
      expect((await post(request(message))).status).toBe(400);
    }
    expect((await post(new Request("https://cansoria.com/api/chat", { method: "POST", body: "{" }))).status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized body before reading it", async () => {
    const req = request("hi", { "content-length": "16385" });
    const read = jest.spyOn(req, "json");
    expect((await post(req)).status).toBe(413);
    expect(read).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects actual oversized bodies even without content length", async () => {
    const req = new Request("https://cansoria.com/api/chat", { method: "POST", body: JSON.stringify({ message: "hi", padding: "x".repeat(16384) }) });
    expect((await post(req)).status).toBe(413);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("caps output tokens and propagates an abort deadline", async () => {
    const response = await post(request("painting ideas"));
    expect(response.status).toBe(200);
    const config = (generateContent.mock.calls[0][0] as { config: { maxOutputTokens: number; abortSignal: AbortSignal } }).config;
    expect(config.maxOutputTokens).toBeLessThanOrEqual(256);
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("enforces a shared daily budget regardless of spoofed forwarding headers", async () => {
    process.env.CHAT_DAILY_CALL_BUDGET = "1";
    expect((await post(request("hello", { "x-forwarded-for": "1.1.1.1" }))).status).toBe(200);
    const blocked = await post(request("hello", { "x-forwarded-for": "2.2.2.2" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("rejects production calls without a distributed limiter", async () => {
    const previous = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: "production" });
    try {
      expect((await post(request("hello"))).status).toBe(503);
      expect(generateContent).not.toHaveBeenCalled();
    } finally {
      Object.assign(process.env, { NODE_ENV: previous });
    }
  });

  it("limits anonymous requests per minute despite untrusted spoofed headers", async () => {
    for (let index = 0; index < 10; index++) {
      expect((await post(request("hello", { "x-forwarded-for": `1.1.1.${index}` }))).status).toBe(200);
    }
    expect((await post(request("hello", { "x-forwarded-for": "2.2.2.2" }))).status).toBe(429);
    expect(generateContent).toHaveBeenCalledTimes(10);
  });

  it("allows at most four simultaneous paid calls and releases successful slots", async () => {
    const finish: Array<() => void> = [];
    generateContent.mockImplementation(() => new Promise(resolve => finish.push(() => resolve({ text: "done" }))));
    const active = [0, 1, 2, 3].map(() => post(request("hello")));
    await new Promise(resolve => setImmediate(resolve));
    expect(generateContent).toHaveBeenCalledTimes(4);
    expect((await post(request("fifth"))).status).toBe(429);
    finish.forEach(resolve => resolve());
    expect((await Promise.all(active)).map(response => response.status)).toEqual([200, 200, 200, 200]);
    generateContent.mockResolvedValue({ text: "again" });
    expect((await post(request("after release"))).status).toBe(200);
  });

  it("aborts Gemini after ten seconds and returns a generic unavailable response", async () => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    generateContent.mockImplementation((input) => new Promise((_resolve, reject) => {
      const signal = (input as { config: { abortSignal: AbortSignal } }).config.abortSignal;
      signal.addEventListener("abort", () => reject(new Error("secret Gemini diagnostic")), { once: true });
    }));
    const pending = post(request("hello"));
    await new Promise(resolve => setImmediate(resolve));
    expect(generateContent).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(10_000);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret Gemini diagnostic");
  });

  it("fails closed when configured Redis is unreachable", async () => {
    process.env.CHAT_REDIS_URL = "redis://127.0.0.1:1";
    expect((await post(request("hello"))).status).toBe(503);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
