import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getProductsWithVariantImages } from "@/lib/medusa";
import { useRegion } from "@/lib/providers";

const BACKEND_URL = "/api/medusa";
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";


interface OrderItem {
  id: string;
  title: string;
  variant_title?: string;
  variant_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
}

interface Order {
  id: string;
  display_id: number;
  created_at: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  total: number;
  currency_code: string;
  email: string;
  items: OrderItem[];
}

interface AccountUser {
  email?: string | null;
}

interface VariantImage {
  url?: string | null;
  rank?: number | null;
}

interface ProductVariantWithImages {
  id?: string;
  thumbnail?: string | null;
  images?: VariantImage[] | null;
}

interface ProductWithVariantImages {
  thumbnail?: string | null;
  images?: Array<{ url?: string | null }> | null;
  variants?: ProductVariantWithImages[] | null;
}

export function OrdersContent({ user }: { user: AccountUser | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { region } = useRegion();
  // Map variant_id -> image URL for variant-specific images
  const [variantImageMap, setVariantImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  // Resolve variant images once orders are loaded
  useEffect(() => {
    async function resolveVariantImages() {
      if (!orders.length || !region?.id) return;

      // Collect unique product IDs from all order items
      const productIds = new Set<string>();
      orders.forEach((order) => {
        order.items?.forEach((item) => {
          if (item.variant_id && item.product_id && !variantImageMap[item.variant_id]) {
            productIds.add(item.product_id);
          }
        });
      });

      if (productIds.size === 0) return;

      try {
        const products = await getProductsWithVariantImages(Array.from(productIds), region.id);
        if (!products || products.length === 0) return;

        const newVariantImages: Record<string, string> = {};

        const productsWithImages = products as ProductWithVariantImages[];

        productsWithImages.forEach((product) => {
          const productImage = product.thumbnail || product.images?.[0]?.url;

          if (product.variants) {
            product.variants.forEach((variant) => {
              if (!variant.id) return;

              if (variant.thumbnail) {
                newVariantImages[variant.id] = variant.thumbnail;
              } else if (variant.images && variant.images.length > 0) {
                const sorted = [...variant.images].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
                const firstImageUrl = sorted[0]?.url;
                if (firstImageUrl) {
                  newVariantImages[variant.id] = firstImageUrl;
                }
              } else if (productImage) {
                newVariantImages[variant.id] = productImage;
              }
            });
          }
        });

        if (Object.keys(newVariantImages).length > 0) {
          setVariantImageMap(prev => ({ ...prev, ...newVariantImages }));
        }
      } catch (error) {
        console.error("Failed to fetch variant images for orders:", error);
      }
    }

    resolveVariantImages();
  }, [orders, region?.id, variantImageMap]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      // Request variant_id and product_id fields for variant image resolution
      const response = await fetch(`${BACKEND_URL}/store/orders?fields=+items.variant_id,+items.product_id,+email`, {
        headers: {
          "x-publishable-api-key": API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // Get the best image for an order item
  const getItemImage = (item: OrderItem): string | undefined => {
    // Priority 1: Variant-specific image (resolved from product API)
    if (item.variant_id && variantImageMap[item.variant_id]) {
      return variantImageMap[item.variant_id];
    }
    // Priority 2: Item thumbnail (product-level)
    return item.thumbnail;
  };

  // Get preview images for the order card (up to 3)
  const getOrderPreviewImages = (order: Order) => {
    return order.items.slice(0, 3).map(item => ({
      src: getItemImage(item),
      alt: item.title
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "shipped": return "bg-purple-100 text-purple-800";
      case "completed": case "delivered": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (amount: number, currency: string = "gbp") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-100 min-h-[400px]">
      <h2 className="font-serif text-xl md:text-2xl text-charcoal mb-6">Order History</h2>

      {loadingOrders ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-charcoal-light mb-4">No orders yet</p>
          <Link
            href="/shop"
            className="inline-block bg-terracotta text-white px-6 py-3 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const previewImages = getOrderPreviewImages(order);
            const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

            return (
              <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                {/* Order Summary Header (Clickable) */}
                <div
                  onClick={() => toggleOrder(order.id)}
                  className="bg-gray-50/50 p-4 cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Preview Image (First Item) */}
                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex-shrink-0 overflow-hidden relative">
                      {previewImages[0]?.src ? (
                        <img src={previewImages[0].src} alt={previewImages[0].alt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package size={20} />
                        </div>
                      )}
                      {order.items.length > 1 && (
                        <div className="absolute bottom-0 right-0 bg-charcoal/80 text-white text-[9px] px-1.5 py-0.5 rounded-tl-md">
                          +{order.items.length - 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-charcoal text-xs uppercase">Order: {order.id.replace("order_", "").slice(0, 10)}...</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.fulfillment_status || order.status)}`}>
                          {order.fulfillment_status || order.status}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-charcoal-light">
                        <span>{formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                        <span>•</span>
                        <span className="font-medium text-charcoal">{formatPrice(order.total, order.currency_code)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-charcoal-light">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && order.items && order.items.length > 0 && (
                  <div className="border-t border-gray-100 p-4 bg-white animate-accordion-down">
                    <div className="space-y-4">
                      {order.items.map((item) => {
                        const imageSrc = getItemImage(item);
                        return (
                          <div key={item.id} className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded border border-gray-100 flex-shrink-0 overflow-hidden">
                              {imageSrc && (
                                <img src={imageSrc} alt={item.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal truncate">{item.title}</p>
                              <p className="text-xs text-charcoal-light mb-1">{item.variant_title}</p>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-charcoal-light">Qty: {item.quantity}</span>
                                <span className="font-medium text-charcoal">{formatPrice(item.unit_price, order.currency_code)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <Link href={`/order/lookup?order=${order.id}&email=${encodeURIComponent(order.email || user?.email || "")}`} className="text-xs font-bold uppercase tracking-widest text-terracotta hover:text-terracotta-dark">
                        View Full Details
                      </Link>
                      <div className="text-right">
                        <span className="text-xs text-charcoal-light">Total: </span>
                        <span className="font-serif text-lg font-bold text-charcoal">{formatPrice(order.total, order.currency_code)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
