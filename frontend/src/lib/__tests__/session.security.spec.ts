import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
const fetchMock = jest.fn<typeof fetch>();
const cookieJar = new Map<string, string>();
let authPost: typeof import('../../app/api/auth/[action]/route').POST;
let storeGet: typeof import('../../app/api/medusa/[...path]/route').GET;
let storePost: typeof import('../../app/api/medusa/[...path]/route').POST;
let paymentPost: typeof import('../../app/api/checkout/[cartId]/payment-sessions/route').POST;
let backendFetch: typeof import('../server-medusa').backendFetch;

function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://shop.test${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: 'https://shop.test', 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const authContext = (action: string) => ({ params: Promise.resolve({ action }) });
const storeContext = (...path: string[]) => ({ params: Promise.resolve({ path }) });
const json = (data: unknown, status = 200) => Response.json(data, { status });
const jwt = () => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;

beforeEach(async () => {
  process.env.NEXT_PUBLIC_BASE_URL = 'https://shop.test';
  process.env.MEDUSA_BACKEND_URL = 'https://backend.test';
  process.env.MEDUSA_PUBLISHABLE_KEY = 'pk_test';
  delete process.env.STORE_TRUSTED_IP_HEADER;
  delete process.env.STORE_TRUSTED_PROXY_HOPS;
  cookieJar.clear();
  const { cookies } = await import('next/headers');
  authPost = (await import('../../app/api/auth/[action]/route')).POST;
  ({ GET: storeGet, POST: storePost } = await import('../../app/api/medusa/[...path]/route'));
  paymentPost = (await import('../../app/api/checkout/[cartId]/payment-sessions/route')).POST;
  ({ backendFetch } = await import('../server-medusa'));
  jest.mocked(cookies).mockResolvedValue({ get: (name: string) => cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined } as Awaited<ReturnType<typeof cookies>>);
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

describe('server session and capability boundary', () => {
  it('stores login credentials in an HttpOnly cookie and never returns the token', async () => {
    const token = jwt();
    fetchMock.mockResolvedValueOnce(json({ token }));
    const response = await authPost(request('/api/auth/login', { email: 'member@example.test', password: 'password' }), authContext('login'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get('set-cookie')).toContain(`cansoria_session=${token}`);
    expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(response.headers.get('set-cookie')).toMatch(/SameSite=lax/i);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects login CSRF before contacting the backend', async () => {
    const response = await authPost(request('/api/auth/login', { email: 'member@example.test', password: 'password' }, { Origin: 'https://evil.test' }), authContext('login'));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves the exact legacy email identity when logging in', async () => {
    fetchMock.mockResolvedValueOnce(json({ token: jwt() }));
    const response = await authPost(request('/api/auth/login', { email: 'Legacy@Example.test', password: 'password' }), authContext('login'));
    expect(response.status).toBe(200);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).email).toBe('Legacy@Example.test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('supports mixed-case login for normalized new registrations', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Invalid credentials' }, 401)).mockResolvedValueOnce(json({ token: jwt() }));
    const response = await authPost(request('/api/auth/login', { email: 'Member@Example.test', password: 'password' }), authContext('login'));
    expect(response.status).toBe(200);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).email).toBe('member@example.test');
  });

  it('refreshes registration authentication after the customer actor exists', async () => {
    fetchMock.mockResolvedValueOnce(json({ token: jwt() })).mockResolvedValueOnce(json({ customer: { id: 'cus_123' } })).mockResolvedValueOnce(json({ token: jwt() }));
    const response = await authPost(request('/api/auth/register', { email: 'member@example.test', password: 'password', first_name: 'A', last_name: 'B' }), authContext('register'));
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://backend.test/auth/customer/emailpass/register',
      'https://backend.test/store/customers',
      'https://backend.test/auth/customer/emailpass',
    ]);
  });

  it('replaces browser authentication headers with the server cookie', async () => {
    cookieJar.set('cansoria_session', 'server-jwt');
    cookieJar.set('cansoria_cart_access', 'server-capability');
    fetchMock.mockResolvedValueOnce(json({ cart: { id: 'cart_123' } }));
    const response = await storeGet(request('/api/medusa/store/carts/cart_123', undefined, { Authorization: 'Bearer forged', 'x-cart-access-token': 'forged' }), storeContext('store', 'carts', 'cart_123'));
    expect(response.status).toBe(200);
    const forwarded = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(forwarded.get('Authorization')).toBe('Bearer server-jwt');
    expect(forwarded.get('x-cart-access-token')).toBe('server-capability');
    expect(forwarded.get('x-publishable-api-key')).toBe('pk_test');
  });

  it('stores a newly issued cart capability only in an HttpOnly cookie', async () => {
    fetchMock.mockResolvedValueOnce(json({ cart: { id: 'cart_123' }, cart_access_token: 'signed-capability' }));
    const response = await storePost(request('/api/medusa/store/carts', { region_id: 'reg_123' }), storeContext('store', 'carts'));
    expect(await response.json()).toEqual({ cart: { id: 'cart_123' } });
    expect(response.headers.get('set-cookie')).toContain('cansoria_cart_access=signed-capability');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('cannot proxy an admin or auth path', async () => {
    const response = await storeGet(request('/api/medusa/admin/users'), storeContext('admin', 'users'));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves query text without allowing a change of backend origin', async () => {
    fetchMock.mockResolvedValueOnce(json({ products: [] }));
    await backendFetch('store/products?q=a?b&limit=1');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://backend.test/store/products?q=a?b&limit=1');
  });

  it('forwards client IP only through an explicitly configured trusted ingress header', async () => {
    fetchMock.mockImplementation(async () => json({ products: [] }));
    const req = request('/api/medusa/store/products', undefined, { 'x-forwarded-for': '198.51.100.1, 192.0.2.10', 'x-real-ip': '203.0.113.1' });
    await backendFetch('store/products', {}, undefined, req);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('x-real-ip')).toBe(false);
    process.env.STORE_TRUSTED_IP_HEADER = 'x-forwarded-for';
    process.env.STORE_TRUSTED_PROXY_HOPS = '1';
    await backendFetch('store/products', {}, undefined, req);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('x-real-ip')).toBe('192.0.2.10');
    process.env.STORE_TRUSTED_PROXY_HOPS = '0';
    await backendFetch('store/products', {}, undefined, req);
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).has('x-real-ip')).toBe(false);
  });

  it('removes both session and cart credentials on logout', async () => {
    const response = await authPost(request('/api/auth/logout', {}), authContext('logout'));
    const header = response.headers.get('set-cookie')!;
    expect(header).toContain('cansoria_session=');
    expect(header).toContain('cansoria_cart_access=');
    expect(header).toContain('Max-Age=0');
  });

  it('returns stable errors instead of upstream payment details', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'secret stripe key and address' }, 500));
    const response = await paymentPost(request('/api/checkout/cart_123/payment-sessions', {}), { params: Promise.resolve({ cartId: 'cart_123' }) });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'The service is temporarily unavailable.' });
  });

  it('initializes payment through guarded cart and collection routes and strips extra payment data', async () => {
    fetchMock.mockResolvedValueOnce(json({ cart: { id: 'cart_123' } }))
      .mockResolvedValueOnce(json({ payment_collection: { id: 'pay_col_123' } }))
      .mockResolvedValueOnce(json({ payment_collection: { payment_sessions: [{ id: 'ps_123', provider_id: 'pp_stripe_stripe', status: 'pending', data: { client_secret: 'pi_secret', internal: 'sensitive' } }] } }));
    const response = await paymentPost(request('/api/checkout/cart_123/payment-sessions', {}), { params: Promise.resolve({ cartId: 'cart_123' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.payment_session.data).toEqual({ client_secret: 'pi_secret' });
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'https://backend.test/store/carts/cart_123',
      'https://backend.test/store/payment-collections',
      'https://backend.test/store/payment-collections/pay_col_123/payment-sessions',
    ]);
  });
});
