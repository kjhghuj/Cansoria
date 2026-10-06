import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import Redis from "ioredis";

export const CHAT_MAX_BODY_BYTES = 16 * 1024;
export const CHAT_DEADLINE_MS = 10_000;
const LEASE_MS = 30_000;
const WINDOW_MS = 60_000;
const IP_LIMIT = 10;
const CONCURRENCY_LIMIT = 4;
const MAX_MEMORY_CLIENTS = 1000;

export class ChatControlError extends Error {
  constructor(public readonly status: number, public readonly retryAfter = 60) {
    super("Chat request unavailable.");
  }
}

export async function readChatBody(request: Request, signal: AbortSignal): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > CHAT_MAX_BODY_BYTES)) {
    throw new ChatControlError(413);
  }
  if (!request.body) throw new ChatControlError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const cancel = () => { void reader.cancel().catch(() => undefined); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) throw new ChatControlError(503);
    while (true) {
      const { done, value } = await reader.read();
      if (signal.aborted) throw new ChatControlError(503);
      if (done) break;
      total += value.byteLength;
      if (total > CHAT_MAX_BODY_BYTES) {
        cancel();
        throw new ChatControlError(413);
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks, total);
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof ChatControlError) throw error;
    throw new ChatControlError(400);
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

/** Only trust a header when the ingress overwrites it and direct origin access is blocked. */
export function chatClientKey(request: Request): string {
  const header = process.env.CHAT_TRUSTED_IP_HEADER?.toLowerCase();
  let ip = "shared-anonymous";
  if (header && ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(header)) {
    const values = (request.headers.get(header) ?? "").split(",").map(value => value.trim());
    const hops = Number(process.env.CHAT_TRUSTED_PROXY_HOPS ?? "1");
    const candidate = header === "x-forwarded-for"
      ? (Number.isInteger(hops) && hops >= 1 && hops <= 10 ? values[values.length - hops] : undefined)
      : (values.length === 1 ? values[0] : undefined);
    if (candidate && isIP(candidate)) ip = candidate;
  }
  return createHash("sha256").update(ip).digest("hex");
}

function dailyBudget(): number {
  const budget = Number(process.env.CHAT_DAILY_CALL_BUDGET ?? "500");
  if (!Number.isSafeInteger(budget) || budget < 1 || budget > 10_000) throw new ChatControlError(503);
  return budget;
}

// Redis TIME makes admission atomic across processes and independent of their clock skew.
const ADMIT_SCRIPT = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local window = tonumber(ARGV[2])
local start = tonumber(redis.call('HGET', KEYS[1], 'start') or '0')
if now - start >= window then
  redis.call('HSET', KEYS[1], 'start', now, 'count', 0)
  start = now
end
local count = redis.call('HINCRBY', KEYS[1], 'count', 1)
redis.call('PEXPIRE', KEYS[1], window)
if count > tonumber(ARGV[3]) then return {1, math.ceil((start + window - now) / 1000)} end
local day = math.floor(now / 86400000)
local retry = math.ceil(((day + 1) * 86400000 - now) / 1000)
if tonumber(redis.call('HGET', KEYS[2], 'day') or '-1') ~= day then
  redis.call('HSET', KEYS[2], 'day', day, 'count', 0)
end
local used = tonumber(redis.call('HGET', KEYS[2], 'count') or '0')
if used >= tonumber(ARGV[4]) then return {2, retry} end
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)
if redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[5]) then return {3, 10} end
redis.call('HINCRBY', KEYS[2], 'count', 1)
redis.call('EXPIRE', KEYS[2], retry + 60)
redis.call('ZADD', KEYS[3], now + tonumber(ARGV[6]), ARGV[1])
redis.call('PEXPIRE', KEYS[3], tonumber(ARGV[6]) + 60000)
return {0, 0}
`;

let redisClient: Redis | undefined;
let redisUrl: string | undefined;
let connecting: Promise<void> | undefined;

async function getRedis(url: string): Promise<Redis> {
  if (!redisClient || redisUrl !== url || redisClient.status === "end") {
    redisClient?.disconnect();
    redisClient = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 1500,
      commandTimeout: 1500,
      retryStrategy: () => null,
    });
    // The route reports a generic unavailable response; avoid unhandled error events.
    redisClient.on("error", () => undefined);
    redisUrl = url;
    connecting = undefined;
  }
  const client = redisClient;
  if (client.status === "wait") connecting = client.connect();
  if (connecting) await connecting;
  if (client.status !== "ready") throw new ChatControlError(503);
  return client;
}

const memoryClients = new Map<string, { start: number; count: number }>();
const memoryLeases = new Map<string, number>();
let memoryDay = -1;
let memoryUsed = 0;

function admitInMemory(clientKey: string, budget: number): () => Promise<void> {
  const now = Date.now();
  for (const [key, value] of memoryClients) if (now - value.start >= WINDOW_MS) memoryClients.delete(key);
  let client = memoryClients.get(clientKey);
  if (!client) {
    if (memoryClients.size >= MAX_MEMORY_CLIENTS) memoryClients.delete(memoryClients.keys().next().value!);
    client = { start: now, count: 0 };
    memoryClients.set(clientKey, client);
  }
  client.count++;
  if (client.count > IP_LIMIT) throw new ChatControlError(429, Math.ceil((client.start + WINDOW_MS - now) / 1000));
  const day = Math.floor(now / 86_400_000);
  if (day !== memoryDay) { memoryDay = day; memoryUsed = 0; }
  if (memoryUsed >= budget) throw new ChatControlError(429, Math.ceil(((day + 1) * 86_400_000 - now) / 1000));
  for (const [key, expires] of memoryLeases) if (expires <= now) memoryLeases.delete(key);
  if (memoryLeases.size >= CONCURRENCY_LIMIT) throw new ChatControlError(429, 10);
  const lease = randomUUID();
  memoryLeases.set(lease, now + LEASE_MS);
  memoryUsed++;
  return async () => { memoryLeases.delete(lease); };
}

/** Reserve both a paid-call budget slot and a bounded concurrency lease before calling Gemini. */
export async function admitChatRequest(clientKey: string): Promise<() => Promise<void>> {
  const budget = dailyBudget();
  const url = process.env.CHAT_REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new ChatControlError(503);
    return admitInMemory(clientKey, budget);
  }
  try {
    const client = await getRedis(url);
    const lease = randomUUID();
    const keys = [`{cansoria-chat}:ip:${clientKey}`, "{cansoria-chat}:budget", "{cansoria-chat}:leases"];
    const result = await client.eval(ADMIT_SCRIPT, keys.length, ...keys, lease, WINDOW_MS, IP_LIMIT, budget, CONCURRENCY_LIMIT, LEASE_MS) as [number, number];
    if (!Array.isArray(result) || result.length !== 2) throw new ChatControlError(503);
    if (Number(result[0]) !== 0) throw new ChatControlError(429, Math.max(1, Number(result[1]) || 60));
    return async () => { try { await client.zrem(keys[2], lease); } catch { /* The lease expires if Redis is temporarily unavailable. */ } };
  } catch (error) {
    if (error instanceof ChatControlError) throw error;
    throw new ChatControlError(503);
  }
}
