/**
 * Unit tests for cart coupon operations
 * 
 * These tests verify that applying and removing coupons doesn't cause
 * cart item duplication or incorrect pricing.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

// Import after mocking
import { applyPromoCode, removePromoCode } from '../medusa';

describe('Cart Coupon Operations', () => {
    const mockCartId = 'cart_test_123';
    const mockPromoCode = 'TEST10';

    const mockCartWithoutPromo = {
        id: mockCartId,
        items: [
            { id: 'item_1', quantity: 1, unit_price: 1000, total: 1000 }
        ],
        promotions: [],
        total: 1000,
        discount_total: 0
    };

    const mockCartWithPromo = {
        id: mockCartId,
        items: [
            { id: 'item_1', quantity: 1, unit_price: 1000, total: 900 }
        ],
        promotions: [{ id: 'promo_1', code: 'TEST10' }],
        total: 900,
        discount_total: 100
    };

    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
    });

    describe('applyPromoCode', () => {
        it('should apply promo code without duplicating items', async () => {
            // Mock the POST request to apply promo
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cart: mockCartWithPromo })
            });

            // Mock the GET request to fetch updated cart
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cart: mockCartWithPromo })
            });

            const result = await applyPromoCode(mockCartId, mockPromoCode);

            // Verify cart structure
            expect(result).toBeDefined();
            expect(result.items).toHaveLength(1);
            expect(result.items[0].quantity).toBe(1);
            expect(result.promotions).toHaveLength(1);
            expect(result.total).toBe(900);
        });

        it('should handle errors gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => JSON.stringify({ message: 'Invalid promo code' })
            });

            await expect(applyPromoCode(mockCartId, 'INVALID')).rejects.toThrow();
        });
    });

    describe('removePromoCode', () => {
        it('should remove promo code without affecting item quantities', async () => {
            // Mock the DELETE request
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cart: mockCartWithoutPromo })
            });

            // Mock the GET request
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ cart: mockCartWithoutPromo })
            });

            const result = await removePromoCode(mockCartId, mockPromoCode);

            // Verify cart structure
            expect(result).toBeDefined();
            expect(result.items).toHaveLength(1);
            expect(result.items[0].quantity).toBe(1);
            expect(result.promotions).toHaveLength(0);
            expect(result.total).toBe(1000);
        });
    });

    describe('Sequential operations', () => {
        it('should handle apply -> remove -> apply without duplication', async () => {
            // First apply
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ cart: mockCartWithPromo }) });

            const cart1 = await applyPromoCode(mockCartId, mockPromoCode);
            expect(cart1.items).toHaveLength(1);
            expect(cart1.items[0].quantity).toBe(1);

            // Remove
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ cart: mockCartWithoutPromo }) });

            const cart2 = await removePromoCode(mockCartId, mockPromoCode);
            expect(cart2.items).toHaveLength(1);
            expect(cart2.items[0].quantity).toBe(1);

            // Re-apply
            (global.fetch as jest.Mock)
                .mockResolvedValueOnce({ ok: true })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ cart: mockCartWithPromo }) });

            const cart3 = await applyPromoCode(mockCartId, mockPromoCode);

            // CRITICAL: Items should still be 1, not 3
            expect(cart3.items).toHaveLength(1);
            expect(cart3.items[0].quantity).toBe(1);
            // Total should not be 0
            expect(cart3.total).toBeGreaterThan(0);
        });
    });
});
