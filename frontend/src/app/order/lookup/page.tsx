"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getProductsWithVariantImages } from "@/lib/medusa";

// Icons
function SearchIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
    );
}

interface LookupOrderItem {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    thumbnail?: string | null;
    variant_id?: string | null;
    product_id?: string | null;
}

interface LookupOrder {
    id: string;
    email?: string | null;
    status: string;
    created_at: string;
    total: number;
    currency_code: string;
    region_id?: string;
    items?: LookupOrderItem[];
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

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "";
}

function OrderLookupContent() {
    const searchParams = useSearchParams();
    const [orderId, setOrderId] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderData, setOrderData] = useState<LookupOrder | null>(null);
    const [variantImageMap, setVariantImageMap] = useState<Record<string, string>>({});

    // Resolve variant images once order is loaded
    useEffect(() => {
        async function resolveVariantImages() {
            if (!orderData || !orderData.items) return;

            // Collect unique product IDs from order items with variants
            const productIds = new Set<string>();
            orderData.items.forEach((item) => {
                if (item.variant_id && item.product_id && !variantImageMap[item.variant_id]) {
                    productIds.add(item.product_id);
                }
            });

            if (productIds.size === 0) return;

            try {
                // Use undefined for region_id since we check order items directly
                const products = await getProductsWithVariantImages(Array.from(productIds), orderData.region_id);
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
                console.error("Failed to fetch variant images:", error);
            }
        }

        resolveVariantImages();
    }, [orderData, variantImageMap]);

    const lookupOrder = async (id: string, mail: string) => {
        if (!id || !mail) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);
        setError(null);
        setOrderData(null);

        try {
            // Prepend order_ prefix if not already present
            const fullOrderId = id.startsWith('order_') ? id : `order_${id}`;

            // Request fields needed for variant image resolution
            const response = await fetch(`/api/medusa/store/orders/${fullOrderId}?fields=+items.variant_id,+items.product_id`, {
                headers: {
                    'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '',
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Order not found or access denied.");
                }
                throw new Error("Could not retrieve order details.");
            }

            const data = (await response.json()) as { order?: LookupOrder };
            const order = data.order;

            // Security Check: Client-side email validation
            if (!order || !order.email || order.email.toLowerCase() !== mail.toLowerCase()) {
                // Fake 404 security practice: Don't reveal order exists if email mismatch
                throw new Error("Order not found with provided details.");
            }

            setOrderData(order);

        } catch (err: unknown) {
            console.error("Lookup error:", err);
            setError(getErrorMessage(err) || "We could not find an order confirming those details. Please check and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        await lookupOrder(orderId, email);
    };

    useEffect(() => {
        const urlOrder = searchParams.get("order");
        const urlEmail = searchParams.get("email");

        if (urlOrder && urlEmail) {
            setOrderId(urlOrder);
            setEmail(urlEmail);
            // Small delay to ensure state updates or UI readiness if needed, but direct call is fine
            lookupOrder(urlOrder, urlEmail);
        }
    }, [searchParams]);

    return (
        <div className="pt-24 pb-20 bg-cream">
            <div className="max-w-xl mx-auto px-6">

                <h1 className="font-serif text-3xl text-charcoal mb-4 text-center">Track Your Order</h1>
                <p className="text-charcoal-light text-center mb-10">
                    Enter your order ID and the email address used at checkout to view your order status.
                </p>

                {!orderData ? (
                    /* LOOKUP FORM */
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <form onSubmit={handleLookup} className="space-y-6">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Order ID</label>
                                <input
                                    type="text"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value.trim())}
                                    placeholder="e.g. 01JMHK7X8Y..."
                                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-terracotta rounded-lg"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.trim())}
                                    placeholder="email@example.com"
                                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-terracotta rounded-lg"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg flex gap-2 items-start">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-charcoal text-white py-4 rounded-full hover:bg-charcoal-light transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <SearchIcon />
                                        <span>Track Order</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* ORDER DETAILS */
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 animate-fade-in">
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-charcoal-light mb-1">Status</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${orderData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    orderData.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                    {orderData.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase tracking-widest text-charcoal-light mb-1">Date</p>
                                <p className="text-sm font-medium text-charcoal">
                                    {new Date(orderData.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            {orderData.items?.map((item) => (
                                <div key={item.id} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded flex-shrink-0 relative overflow-hidden">
                                            {/* Display resolved variant image or fallback to thumbnail */}
                                            {(item.variant_id && variantImageMap[item.variant_id]) ? (
                                                <img src={variantImageMap[item.variant_id]} alt={item.title} className="w-full h-full object-cover" />
                                            ) : item.thumbnail ? (
                                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                            ) : null}
                                        </div>
                                        <div>
                                            <p className="font-medium text-charcoal">{item.title}</p>
                                            <p className="text-charcoal-light">Qty: {item.quantity}</p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-charcoal">
                                        {(item.unit_price / 100).toLocaleString('en-GB', { style: 'currency', currency: orderData.currency_code.toUpperCase() })}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-6 flex justify-between items-center mb-8">
                            <span className="font-serif text-lg text-charcoal">Total</span>
                            <span className="font-serif text-xl text-charcoal font-bold">
                                {(orderData.total / 100).toLocaleString('en-GB', { style: 'currency', currency: orderData.currency_code.toUpperCase() })}
                            </span>
                        </div>

                        <div className="text-center space-y-3">
                            <Link href="/shop" className="block w-full text-center bg-charcoal text-white py-3 rounded-full hover:bg-charcoal-light transition-colors font-medium">
                                Continue Shopping
                            </Link>
                            <button onClick={() => setOrderData(null)} className="text-sm text-charcoal-light hover:text-terracotta underline">
                                Search another order
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OrderLookupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin"></div></div>}>
            <OrderLookupContent />
        </Suspense>
    );
}
