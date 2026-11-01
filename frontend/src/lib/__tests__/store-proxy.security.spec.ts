import { describe, expect, it } from '@jest/globals';
import { isStorePathAllowed, isStoreQueryAllowed, isSameOriginWrite, readBoundedJson, upstreamError } from '../store-proxy-policy';

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
  it('allows the cart region update the currency switcher performs', () => {
    expect(isStorePathAllowed(['store', 'carts', 'cart_123'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'carts', 'cart_123'], 'GET')).toBe(true);
    expect(isStorePathAllowed(['store', 'carts', 'cart_123', 'region'], 'POST')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'carts', 'cart_123'], '?fields=items')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'carts', 'cart_123'], '?expand=region')).toBe(false);
  });
  it('rejects cross-origin and missing-origin writes', () => {
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST', headers: { Origin: 'https://evil.test' } }))).toBe(false);
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST' }))).toBe(false);
    expect(isSameOriginWrite(new Request('https://shop.test/api/auth/logout', { method: 'POST', headers: { Origin: 'https://shop.test' } }))).toBe(true);
  });
  it('allows scoped engraving endpoints without exposing photos, files or admin routes', () => {
    const photo = '2c0e1371-36f3-40a7-b8c7-861f3c185559';
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'engraving-items'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'photos'], 'POST')).toBe(false);
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'portrait-items'], 'POST')).toBe(false);
    expect(isStorePathAllowed(['store', 'orders', 'order_a', 'photos', photo], 'GET')).toBe(false);
    expect(isStorePathAllowed(['store', 'carts', 'cart_a', 'photos', 'private-file'], 'GET')).toBe(false);
    expect(isStorePathAllowed(['store', 'contact'], 'POST')).toBe(true);
    expect(isStorePathAllowed(['store', 'contact'], 'GET')).toBe(false);
  });
  it('forwards only enumerated query parameters per storefront path', () => {
    expect(isStoreQueryAllowed(['store', 'products'], '?fields=id&limit=20&offset=0&q=cat&region_id=reg_1&sales_channel_id=sc_1&category_id=pcat_1&handle=cat&collection_id=pcol_1')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'products'], '?id=prod_1&id=prod_2')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'products'], '?internal_note_cost=1')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'products'], '?fields=id&vendor_id=vendor_1')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'carts', 'cart_123'], '?fields=%2Bitems%2C%2Bpromotions')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'orders'], '?fields=%2Bitems.variant_id%2C%2Bemail&limit=10')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'shipping-options'], '?cart_id=cart_1')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'product-categories'], '?include_descendants_tree=true')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'customers', 'me'], '')).toBe(true);
    expect(isStoreQueryAllowed(['store', 'store-info'], '?metadata=true')).toBe(false);
  });
  it('never forwards query parameters on write or photo paths', () => {
    const photo = '2c0e1371-36f3-40a7-b8c7-861f3c185559';
    expect(isStoreQueryAllowed(['store', 'carts'], '?fields=id')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'carts', 'cart_a', 'complete'], '?fields=id')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'carts', 'cart_a', 'photos', photo], '?url=http://evil.test')).toBe(false);
    expect(isStoreQueryAllowed(['store', 'orders', 'order_a', 'photos', photo], '')).toBe(true);
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
