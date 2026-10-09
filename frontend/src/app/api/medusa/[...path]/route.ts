import { NextRequest } from 'next/server';
import { backendFetch, CART_COOKIE, cookieOptions, privateJson, safeBackendFailure } from '@/lib/server-medusa';
import { isSameOriginWrite, isStorePathAllowed, readBoundedJson } from '@/lib/store-proxy-policy';

export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };

async function proxyStore(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (!isStorePathAllowed(path, request.method)) return privateJson({ message: 'Not found.' }, 404);
  if (!isSameOriginWrite(request)) return privateJson({ message: 'Access denied.' }, 403);
  if (request.nextUrl.search.length > 4096) return privateJson({ message: 'Invalid request.' }, 400);
  let body: Record<string, unknown> | undefined;
  try {
    if (request.method !== 'GET') body = await readBoundedJson(request, /^store\/carts\/[\w-]+\/photos$/.test(path.join('/')) ? 14 * 1024 * 1024 : undefined);
  } catch (error) {
    return privateJson({ message: 'Invalid request.' }, error instanceof Error && error.message === 'Request too large' ? 413 : 400);
  }
  try {
    const upstream = await backendFetch(`${path.join('/')}${request.nextUrl.search}`, {
      method: request.method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, request.headers.get('x-order-access-token') || undefined, request);
    if (!upstream.ok) return safeBackendFailure(upstream);
    if (request.method === 'GET' && path.includes('photos')) {
      const mime = upstream.headers.get('content-type')?.split(';')[0];
      if (!mime || !['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return privateJson({ message: 'Photo unavailable.' }, 502);
      return new Response(upstream.body, { headers: { 'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
    }
    if (upstream.status === 204) return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
    const data = await upstream.json();
    const cartToken = path.join('/') === 'store/carts' && request.method === 'POST' && typeof data.cart_access_token === 'string'
      ? data.cart_access_token : undefined;
    delete data.cart_access_token;
    const response = privateJson(data, upstream.status);
    if (cartToken) response.cookies.set(CART_COOKIE, cartToken, { ...cookieOptions, maxAge: 7 * 24 * 3600 });
    return response;
  } catch {
    return privateJson({ message: 'The service is temporarily unavailable.' }, 503);
  }
}

export const GET = proxyStore;
export const POST = proxyStore;
export const DELETE = proxyStore;
