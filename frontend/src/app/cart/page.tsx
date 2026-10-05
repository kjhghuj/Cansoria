"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart, useRegion, useAuth } from "@/lib/providers";
import { applyPromoCode, removePromoCode as removePromoCodeApi } from "@/lib/medusa";
import { StoreProduct } from "@/lib/types";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise, productImageCache } from "./components/utils";
import { TrustBadgeGrid } from "@/components/TrustBadgeGrid";
import type { TrustBadgeItem } from "@/components/TrustBadgeGrid";

// Components
import CartLoading from "./components/CartLoading";
import EmptyCart from "./components/EmptyCart";
import CartItem from "./components/CartItem";
import CouponSection from "./components/CouponSection";
import OrderSummary from "./components/OrderSummary";

type CartPromotion = { code?: string | null };

const cartTrustItems: TrustBadgeItem[] = [
  { kind: "secure", title: "Secure checkout" },
  { kind: "preview", title: "Free preview before shipping" },
  { kind: "guarantee", title: "Satisfaction guarantee" },
  { kind: "shipping", title: "Worldwide shipping" },
];

function getCartPromotions(cart: { promotions?: CartPromotion[] | null } | null) {
  return cart?.promotions ?? [];
}

// Main Cart Page Component
function CartContent() {
  const { cart, cartLoading, cartCount, updateItem, removeItem, applyBetterCoupon, removePromoCode, refreshCart: refreshCartFn } = useCart();
  const { region } = useRegion();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
  // Map variant_id -> image URL for variant-specific images
  const [variantImageMap, setVariantImageMap] = useState<Record<string, string>>({});

  // Fetch product data with variant images to resolve variant-specific cart images
  // This replicates ProductGallery logic: variant.images > product.thumbnail > placeholder
  useEffect(() => {
    async function fetchVariantImages() {
      if (!cart?.items || !region?.id) return;

      // Collect unique product IDs that need fetching
      const productIds = new Set<string>();
      cart.items.forEach((item) => {
        if (item.variant_id && !variantImageMap[item.variant_id] && item.product_id) {
          productIds.add(item.product_id);
        }
      });

      if (productIds.size === 0) return;

      try {
        // Use getProductsByIds but with variant images included
        const { getProductsWithVariantImages } = await import("@/lib/medusa");
        const products = await getProductsWithVariantImages(Array.from(productIds), region.id);

        if (!products || products.length === 0) return;

        const newResolvedImages: Record<string, string> = {};
        const newVariantImages: Record<string, string> = {};

        products.forEach((product: StoreProduct) => {
          // Cache product-level fallback image
          const productImage = product.thumbnail || product.images?.[0]?.url;
          if (productImage && product.id) {
            productImageCache[product.id] = productImage;
            newResolvedImages[product.id] = productImage;
          }

          // Build variant_id -> image map
          // Priority: variant.thumbnail > variant.images[0] (sorted by rank) > product.thumbnail
          if (product.variants) {
            product.variants.forEach((variant) => {
              if (!variant.id) return;

              if (variant.thumbnail) {
                newVariantImages[variant.id] = variant.thumbnail;
              } else if (variant.images && variant.images.length > 0) {
                const sorted = [...variant.images].sort(
                  (a, b) => (a.rank ?? 999) - (b.rank ?? 999)
                );
                newVariantImages[variant.id] = sorted[0].url;
              } else if (productImage) {
                newVariantImages[variant.id] = productImage;
              }
            });
          }
        });

        if (Object.keys(newResolvedImages).length > 0) {
          setResolvedImages(prev => ({ ...prev, ...newResolvedImages }));
        }
        if (Object.keys(newVariantImages).length > 0) {
          setVariantImageMap(prev => ({ ...prev, ...newVariantImages }));
        }
      } catch (error) {
        console.error("Failed to fetch variant images:", error);
      }
    }

    fetchVariantImages();
  }, [cart?.items, region?.id, variantImageMap]);


  // Auto-apply coupon from URL
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam && cart && !cartLoading) {
      // Check if already applied to avoid loop
      const alreadyApplied = getCartPromotions(cart).some(
        (promotion) => promotion.code === codeParam.toUpperCase()
      );
      if (!alreadyApplied) {
        applyBetterCoupon(codeParam.toUpperCase());
      }
    }
  }, [searchParams, cart, cartLoading, applyBetterCoupon]);

  // Auto-apply best coupon from customer's coupon wallet
  const autoApplyAttempted = useRef(false);
  useEffect(() => {
    async function autoApplyBestCoupon() {
      // Only run once, when cart is loaded and user is logged in
      if (autoApplyAttempted.current) return;
      if (!cart?.id || cartLoading || !user) return;

      const userCoupons: string[] = (user?.metadata?.coupons as string[]) || [];
      if (userCoupons.length === 0) return;

      // Skip if a coupon is already applied
      const existingPromotions = cart.promotions || [];
      if (existingPromotions.length > 0) return;

      autoApplyAttempted.current = true;

      // Try each coupon and find the one giving the highest discount
      let bestCode: string | null = null;
      let bestDiscount = 0;

      for (const code of userCoupons) {
        try {
          // Apply this coupon
          const cartAfterApply = await applyPromoCode(cart.id, code);
          const discountAmount = cartAfterApply?.discount_total || 0;

          if (discountAmount > bestDiscount) {
            // This coupon is better: remove previous best (if any) first
            if (bestCode) {
              // Previous best was already removed below
            }
            bestDiscount = discountAmount;
            bestCode = code;
          }

          // Remove this coupon so we can try the next one
          await removePromoCodeApi(cart.id, code);
    } catch {
      // Coupon invalid or expired, skip silently
      console.log(`[AutoCoupon] Code ${code} failed, skipping`);
        }
      }

      // Apply the best coupon permanently
      if (bestCode) {
        try {
          await applyPromoCode(cart.id, bestCode);
          // Refresh the cart context to reflect the applied coupon
          await refreshCartFn();
          console.log(`[AutoCoupon] Applied best coupon: ${bestCode} (saves ${bestDiscount})`);
        } catch (err) {
          console.error(`[AutoCoupon] Failed to apply best coupon ${bestCode}:`, err);
        }
      }
    }

    autoApplyBestCoupon();
  }, [cart?.id, cart?.promotions, cartLoading, user, refreshCartFn]);

  // Auto-reset if cart is completed (fixes "Cart already completed" stuck state)
  useEffect(() => {
    if (cart && cart.completed_at) {
      refreshCartFn();
    }
  }, [cart, refreshCartFn]);

  const currencyCode = cart?.currency_code?.toUpperCase() || region?.currency_code?.toUpperCase() || "GBP";

  const handleUpdateQuantity = async (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingItemId(lineItemId);
    try {
      await updateItem(lineItemId, quantity);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (lineItemId: string) => {
    setUpdatingItemId(lineItemId);
    try {
      await removeItem(lineItemId);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleApplyPromoCode = async (code: string) => {
    setPromoLoading(true);
    try {
      // Use the smart "better coupon" logic instead of basic apply
      return await applyBetterCoupon(code);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromoCode = async (code: string) => {
    setPromoLoading(true);
    try {
      await removePromoCode(code);
    } catch (error) {
      console.error("Failed to remove promo code:", error);
    } finally {
      setPromoLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cart?.item_subtotal || 0;
  const shipping = typeof cart?.shipping_total === 'number' ? cart.shipping_total : null;
  const tax = cart?.tax_total || 0;
  const discount = cart?.discount_total || 0;
  const total = cart?.total || subtotal;

  // Get applied promo codes from cart
  const appliedCodes = getCartPromotions(cart)
    .map((promotion) => promotion.code)
    .filter((code): code is string => Boolean(code));

  return (
    <div className="pt-24 pb-16 min-h-screen bg-cream">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 lg:mb-12">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Cansoria Order
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl text-charcoal">
            Your Cart
          </h1>
          <p className="text-charcoal-light mt-3 max-w-2xl">
            Review your custom artwork before checkout.
          </p>
          <TrustBadgeGrid items={cartTrustItems} compact className="mt-6" />
          {cartCount > 0 && !cartLoading && (
            <p className="text-charcoal-light mt-4 text-sm">
              {cartCount} {cartCount === 1 ? "piece" : "pieces"} in your cart
            </p>
          )}
        </div>

        {/* Loading State */}
        {cartLoading && <CartLoading />}

        {/* Empty Cart */}
        {!cartLoading && (!cart || !cart.items || cart.items.length === 0) && (
          <EmptyCart />
        )}

        {/* Cart Content */}
        {!cartLoading && cart && cart.items && cart.items.length > 0 && (
          <div className="lg:grid lg:grid-cols-3 lg:gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="border border-border bg-white px-4 sm:px-6">
                {cart.items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    currencyCode={currencyCode}
                    onUpdateQuantity={(qty) => handleUpdateQuantity(item.id, qty)}
                    onRemove={() => handleRemoveItem(item.id)}
                    isUpdating={updatingItemId === item.id}
                    variantImage={item.variant_id ? variantImageMap[item.variant_id] : undefined}
                    fallbackImage={item.product_id ? (resolvedImages[item.product_id] || productImageCache[item.product_id]) : null}
                  />
                ))}
              </div>

              {/* Coupon Section - Mobile Only (Below items) */}
              <div className="lg:hidden mt-6">
                <CouponSection
                  cart={cart}
                  appliedCodes={appliedCodes}
                  currencyCode={currencyCode}
                  onApplyCode={handleApplyPromoCode}
                  onRemoveCode={handleRemovePromoCode}
                  isLoading={promoLoading}
                />
              </div>

              {/* Mobile Order Summary Trigger */}
              <div className="lg:hidden mt-4">
                <Elements stripe={stripePromise}>
                  <OrderSummary
                    cart={cart}
                    subtotal={subtotal}
                    shipping={shipping}
                    tax={tax}
                    discount={discount}
                    total={total}
                    currencyCode={currencyCode}
                    itemCount={cartCount}
                    isLoading={updatingItemId !== null}
                  />
                </Elements>
              </div>
            </div>

            {/* Desktop Order Summary & Coupon (Right Sidebar) */}
            <div className="hidden lg:block space-y-8">
              {/* Coupon Section - Desktop Only (Above Summary) */}
              <CouponSection
                cart={cart}
                appliedCodes={appliedCodes}
                currencyCode={currencyCode}
                onApplyCode={handleApplyPromoCode}
                onRemoveCode={handleRemovePromoCode}
                isLoading={promoLoading}
              />

              <Elements stripe={stripePromise}>
                <OrderSummary
                  cart={cart}
                  subtotal={subtotal}
                  shipping={shipping}
                  tax={tax}
                  discount={discount}
                  total={total}
                  currencyCode={currencyCode}
                  itemCount={cartCount}
                  isLoading={updatingItemId !== null}
                />
              </Elements>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoading />}>
      <CartContent />
    </Suspense>
  );
}
