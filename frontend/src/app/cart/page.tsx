"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCart, useRegion, useAuth } from "@/lib/providers";
import { StoreProduct } from "@/lib/types";
import { STUDIO } from "@/lib/studio-content";
import { productImageCache } from "./components/utils";
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
  { kind: "preview", title: "Commissions in preparation" },
  { kind: "guarantee", title: "Service details to be confirmed" },
  { kind: "shipping", title: "Delivery details to be confirmed" },
];

function getCartPromotions(
  cart: { promotions?: CartPromotion[] | null } | null,
) {
  return cart?.promotions ?? [];
}

// Main Cart Page Component
function CartContent() {
  const {
    cart,
    cartLoading,
    cartCount,
    updateItem,
    removeItem,
    applyBetterCoupon,
    applySavedCoupons,
    removePromoCode,
    refreshCart: refreshCartFn,
  } = useCart();
  const { region } = useRegion();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [cartError, setCartError] = useState("");
  const attemptedUrlCodes = useRef(new Set<string>());
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>(
    {},
  );
  // Map variant_id -> image URL for variant-specific images
  const [variantImageMap, setVariantImageMap] = useState<
    Record<string, string>
  >({});

  // Fetch product data with variant images to resolve variant-specific cart images
  // This replicates ProductGallery logic: variant.images > product.thumbnail > placeholder
  useEffect(() => {
    async function fetchVariantImages() {
      if (!cart?.items || !region?.id) return;

      // Collect unique product IDs that need fetching
      const productIds = new Set<string>();
      cart.items.forEach((item) => {
        if (
          item.variant_id &&
          !variantImageMap[item.variant_id] &&
          item.product_id
        ) {
          productIds.add(item.product_id);
        }
      });

      if (productIds.size === 0) return;

      try {
        // Use getProductsByIds but with variant images included
        const { getProductsWithVariantImages } = await import("@/lib/medusa");
        const products = await getProductsWithVariantImages(
          Array.from(productIds),
          region.id,
        );

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
                  (a, b) => (a.rank ?? 999) - (b.rank ?? 999),
                );
                newVariantImages[variant.id] = sorted[0].url;
              } else if (productImage) {
                newVariantImages[variant.id] = productImage;
              }
            });
          }
        });

        if (Object.keys(newResolvedImages).length > 0) {
          setResolvedImages((prev) => ({ ...prev, ...newResolvedImages }));
        }
        if (Object.keys(newVariantImages).length > 0) {
          setVariantImageMap((prev) => ({ ...prev, ...newVariantImages }));
        }
      } catch (error) {
        console.error("Failed to fetch variant images:", error);
      }
    }

    fetchVariantImages();
  }, [cart?.items, region?.id, variantImageMap]);

  // Auto-apply coupon from URL
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam && cart && !cartLoading) {
      // Check if already applied to avoid loop
      const alreadyApplied = getCartPromotions(cart).some(
        (promotion) => promotion.code === codeParam.toUpperCase(),
      );
      const key = `${cart.id}:${codeParam.toUpperCase()}`;
      if (attemptedUrlCodes.current.has(key)) return;
      attemptedUrlCodes.current.add(key);
      if (!alreadyApplied) {
        void applyBetterCoupon(codeParam.toUpperCase()).then((result) => {
          if (!result.success) setCartError(result.message);
        });
      }
    }
  }, [searchParams, cart, cartLoading, applyBetterCoupon]);

  // Check saved codes once per account/cart, within the provider's mutation lock.
  const autoApplyAttempted = useRef(new Set<string>());
  useEffect(() => {
    if (
      !cart?.id ||
      cartLoading ||
      !cart.items?.length ||
      !user ||
      searchParams.get("code") ||
      cart.promotions?.length
    )
      return;
    if (!Array.isArray(user.metadata?.coupons) || !user.metadata.coupons.length)
      return;
    const key = user.id + ":" + cart.id;
    if (autoApplyAttempted.current.has(key)) return;
    autoApplyAttempted.current.add(key);
    void applySavedCoupons(user.metadata?.coupons).catch((error) =>
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to apply saved codes. Please try again.",
      ),
    );
  }, [cart, cartLoading, user, searchParams, applySavedCoupons]);

  // Auto-reset if cart is completed (fixes "Cart already completed" stuck state)
  useEffect(() => {
    if (cart && cart.completed_at) {
      void refreshCartFn().catch(() =>
        setCartError("Unable to refresh your cart. Please try again."),
      );
    }
  }, [cart, refreshCartFn]);

  const currencyCode =
    cart?.currency_code?.toUpperCase() ||
    region?.currency_code?.toUpperCase() ||
    "GBP";

  const handleUpdateQuantity = async (lineItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdatingItemId(lineItemId);
    setCartError("");
    try {
      await updateItem(lineItemId, quantity);
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to change the quantity. Please try again.",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (lineItemId: string) => {
    setUpdatingItemId(lineItemId);
    setCartError("");
    try {
      await removeItem(lineItemId);
    } catch (error) {
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to remove this artwork. Please try again.",
      );
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleApplyPromoCode = async (code: string) => {
    setCartError("");
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
      setCartError(
        error instanceof Error
          ? error.message
          : "Unable to remove this code. Please try again.",
      );
    } finally {
      setPromoLoading(false);
    }
  };

  // Calculate totals
  const subtotal = cart?.item_subtotal || 0;
  const shipping =
    cart?.shipping_methods?.length && typeof cart.shipping_total === "number"
      ? cart.shipping_total
      : null;
  const tax = cart?.tax_total || 0;
  const discount = cart?.discount_total || 0;
  const total = cart?.total ?? subtotal;

  // Get applied promo codes from cart
  const appliedCodes = getCartPromotions(cart)
    .map((promotion) => promotion.code)
    .filter((code): code is string => Boolean(code));

  return (
    <div className="pb-16 min-h-screen bg-cream">
      {/* Photo banner header */}
      <div className="relative w-full overflow-hidden">
        <div className="relative h-[240px] sm:h-[280px] lg:h-[320px] w-full">
          <Image
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=2000"
            alt="Sunlit cream living room with framed hand-painted pet portraits"
            fill
            priority
            className="object-cover object-[70%_center] lg:object-center"
            sizes="100vw"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(250,248,245,0.97) 0%, rgba(250,248,245,0.92) 34%, rgba(250,248,245,0.55) 52%, rgba(250,248,245,0) 72%)",
            }}
          />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-toffee">
                  Cansoria Order
                </p>
                <h1 className="font-serif text-4xl lg:text-5xl text-charcoal">
                  Your Cart
                </h1>
                <p className="text-charcoal-light mt-3 max-w-md">
                  {STUDIO.readiness}
                </p>
                {cartCount > 0 && !cartLoading && (
                  <p className="text-charcoal-light mt-3 text-sm">
                    {cartCount} {cartCount === 1 ? "piece" : "pieces"} in your
                    cart
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <TrustBadgeGrid items={cartTrustItems} compact className="mt-8 mb-10" />
        {cartError && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {cartError}
          </p>
        )}

        {/* Loading State */}
        {cartLoading && !cart && <CartLoading />}

        {/* Empty Cart */}
        {!cartLoading && (!cart || !cart.items || cart.items.length === 0) && (
          <EmptyCart />
        )}

        {/* Cart Content */}
        {cart && cart.items && cart.items.length > 0 && (
          <div className="lg:grid lg:grid-cols-3 lg:gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border-subtle bg-cream-light px-4 sm:px-6 shadow-[0_4px_20px_rgba(38,34,30,0.05)]"
                >
                  <CartItem
                    item={item}
                    currencyCode={currencyCode}
                    onUpdateQuantity={(qty) =>
                      handleUpdateQuantity(item.id, qty)
                    }
                    onRemove={() => handleRemoveItem(item.id)}
                    isUpdating={
                      cartLoading || promoLoading || updatingItemId !== null
                    }
                    variantImage={
                      item.variant_id
                        ? variantImageMap[item.variant_id]
                        : undefined
                    }
                    fallbackImage={
                      item.product_id
                        ? resolvedImages[item.product_id] ||
                          productImageCache[item.product_id]
                        : null
                    }
                  />
                </div>
              ))}

              {/* Coupon Section - Mobile Only (Below items) */}
              <div className="lg:hidden mt-6">
                <CouponSection
                  cart={cart}
                  appliedCodes={appliedCodes}
                  currencyCode={currencyCode}
                  onApplyCode={handleApplyPromoCode}
                  onRemoveCode={handleRemovePromoCode}
                  isLoading={cartLoading || promoLoading}
                />
              </div>

              {/* Mobile Order Summary Trigger */}
              <div className="lg:hidden mt-4">
                <OrderSummary
                  cart={cart}
                  subtotal={subtotal}
                  shipping={shipping}
                  tax={tax}
                  discount={discount}
                  total={total}
                  currencyCode={currencyCode}
                  itemCount={cartCount}
                  isLoading={
                    cartLoading || promoLoading || updatingItemId !== null
                  }
                />
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
                isLoading={cartLoading || promoLoading}
              />

              <OrderSummary
                cart={cart}
                subtotal={subtotal}
                shipping={shipping}
                tax={tax}
                discount={discount}
                total={total}
                currencyCode={currencyCode}
                itemCount={cartCount}
                isLoading={
                  cartLoading || promoLoading || updatingItemId !== null
                }
              />
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
