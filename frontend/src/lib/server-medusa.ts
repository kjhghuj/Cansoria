import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { upstreamError } from './store-proxy-policy';

export const SESSION_COOKIE = 'cansoria_session';
export const CART_COOKIE = 'cansoria_cart_access';
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/',
};

export function privateJson(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function backendFetch(path: string, init: RequestInit = {}, orderToken?: string, request?: Request): Promise<Response> {
  const base = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9030';
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid backend configuration');
  // Keep the configured origin fixed, including when the caller supplies a query.
  const queryIndex = path.indexOf('?');
  const pathname = queryIndex < 0 ? path : path.slice(0, queryIndex);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${pathname.replace(/^\//, '')}`;
  url.search = queryIndex < 0 ? '' : path.slice(queryIndex + 1);
  const jar = await cookies();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('x-publishable-api-key', process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '');
  const session = jar.get(SESSION_COOKIE)?.value;
  if (session && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${session}`);
  if (headers.get('Authorization') === '') headers.delete('Authorization');
  const capability = jar.get(CART_COOKIE)?.value;
  if (capability) headers.set('x-cart-access-token', capability);
  if (orderToken && orderToken.length <= 2048) headers.set('x-order-access-token', orderToken);
  // Enable only behind an ingress that overwrites this header and blocks direct access.
  // The backend separately verifies that this request comes from its trusted BFF IP.
  const ipHeader = process.env.STORE_TRUSTED_IP_HEADER?.toLowerCase();
  if (request && ipHeader && ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'].includes(ipHeader)) {
    const values = (request.headers.get(ipHeader) || '').split(',').map(value => value.trim());
    const hops = Number(process.env.STORE_TRUSTED_PROXY_HOPS || '1');
    const candidate = ipHeader === 'x-forwarded-for'
      ? (Number.isInteger(hops) && hops >= 1 && hops <= 10 ? values[values.length - hops] : undefined)
      : (values.length === 1 ? values[0] : undefined);
    if (candidate && isIP(candidate)) headers.set('x-real-ip', candidate);
  }
  return fetch(url, { ...init, headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
}

export function safeBackendFailure(response: Response): NextResponse {
  const result = privateJson(upstreamError(response.status), response.status);
  if (response.status === 429 || response.status === 503) {
    const retry = response.headers.get('Retry-After');
    if (retry && /^\d{1,5}$/.test(retry)) result.headers.set('Retry-After', retry);
  }
  return result;
}
