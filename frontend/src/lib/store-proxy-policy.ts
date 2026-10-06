const ID = '[A-Za-z0-9_-]{1,128}';
const readPaths = [
  /^store\/(products|regions|collections|product-categories)(\/[A-Za-z0-9_-]{1,128})?$/,
  /^store\/(store-info|shipping-options|orders)$/,
  new RegExp(`^store/carts/${ID}$`),
  new RegExp(`^store/orders/${ID}$`),
  new RegExp(`^store/customers/me(/addresses(/${ID})?)?$`),
];
const writePaths = [
  /^store\/(carts|newsletter)$/,
  /^store\/orders\/(access|transfer)$/,
  new RegExp(`^store/carts/${ID}(/(line-items(/${ID})?|promotions|shipping-methods|customer|complete))?$`),
  new RegExp(`^store/customers/me(/addresses(/${ID})?)?$`),
  new RegExp(`^store/payment-collections(/${ID}/payment-sessions)?$`),
];
const deletePaths = [
  new RegExp(`^store/carts/${ID}/(line-items/${ID}|promotions)$`),
  new RegExp(`^store/customers/me/addresses/${ID}$`),
];

export function isStorePathAllowed(segments: string[], method: string): boolean {
  if (!segments.length || segments.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  const path = segments.join('/');
  const patterns = method === 'GET' ? readPaths : method === 'POST' ? writePaths : method === 'DELETE' ? deletePaths : [];
  return patterns.some((pattern) => pattern.test(path));
}

export function isSameOriginWrite(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  const origin = request.headers.get('origin');
  const expected = process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL).origin
    : new URL(request.url).origin;
  return origin === expected && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export async function readBoundedJson(request: Request, limit = 256 * 1024): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > limit) throw new Error('Request too large');
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('Request too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!bytes) return {};
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  const value: unknown = JSON.parse(new TextDecoder().decode(buffer));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON object');
  return value as Record<string, unknown>;
}

export function upstreamError(status: number): { message: string } {
  return { message: status === 401 ? 'Please sign in.' : status === 403 ? 'Access denied.' : status === 404 ? 'Not found.' : status === 429 ? 'Too many requests. Please try again later.' : status >= 500 ? 'The service is temporarily unavailable.' : 'The request could not be completed.' };
}
