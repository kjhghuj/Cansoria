import { describe, expect, it } from '@jest/globals';
import { isStorePathAllowed, isSameOriginWrite, readBoundedJson, upstreamError } from '../store-proxy-policy';

describe('storefront proxy boundary', () => {
  it.each(['admin/users', 'auth/customer/emailpass', 'store/test-email', 'store/check-email', 'test-interface', 'static/private.svg', 'store/orders/order_123/transfer/request', 'store/products/../admin'])('rejects non-storefront path %s', (path) => {
    expect(isStorePathAllowed(path.split('/'), 'GET')).toBe(false);
    expect(isStorePathAllowed(path.split('/'), 'POST')).toBe(false);
  });
  it('restricts methods while preserving guest checkout and account routes', () => {
    expect(isStorePathAllowed(['store', 'products'], 'GET')).toBe(true);
    expect(isStorePathAllowed(['store', 'products'], 'POST')).toBe(false);
    expect(isStorePathAllowed(['store', 'carts', 'cart_123', 'complete'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'customers', 'me', 'addresses', 'addr_123'], 'DELETE')).toBe(true);
    expect(isStorePathAllowed(['store', 'orders', 'access'], 'POST')).toBe(true);
  });
  it('rejects cross-origin and missing-origin writes', () => {
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST', headers: { Origin: 'https://evil.test' } }))).toBe(false);
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST' }))).toBe(false);
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST', headers: { Origin: 'https://shop.test' } }))).toBe(true);
  });
  it('allows scoped portrait endpoints without exposing file or admin routes', () => {
    const photo = '2c0e1371-36f3-40a7-b8c7-861f3c185559';
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'photos'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'portrait-items'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'orders', 'order_a', 'photos', photo], 'GET')).toBe(true);
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'photos', 'private-file'], 'GET')).toBe(false);
    expect(isStorePathAllowed(['store', 'contact'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'contact'], 'GET')).toBe(false);
  });
  it('limits streamed JSON even without Content-Length', async () => {
    const request = new Request('https://shop.test/api', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(100) }) });
    await expect(readBoundedJson(request, 32)).rejects.toThrow('Request too large');
    await expect(readBoundedJson(new Request('https://shop.test/api', { method: 'POST', body: '{"ok":true}' }), 32)).resolves.toEqual({ ok: true });
  });
  it('does not reflect upstream secrets or exception details', () => {
    expect(upstreamError(500)).toEqual({ message: 'The service is temporarily unavailable.' });
    expect(upstreamError(403)).toEqual({ message: 'Access denied.' });
  });
});
