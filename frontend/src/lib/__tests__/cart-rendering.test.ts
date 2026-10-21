import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CartItem from "@/app/cart/components/CartItem";
import OrderSummary from "@/app/cart/components/OrderSummary";
import ProductCard from "@/components/ProductCard";
import type { StoreCart, StoreCartLineItem, StoreProduct } from "../types";

function imageSources(html: string) {
  return [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => {
    const url = new URL(match[1].replace(/&amp;/g, "&"), "http://localhost");
    return url.searchParams.get("url") ?? url.pathname;
  });
}

describe("customer-facing cart and catalog", () => {
  const item = {
    id: "item_test",
    product_title: "Meridian Automatic",
    unit_price: 334.62,
    quantity: 1,
    total: 334.62,
    thumbnail: "/products/generic.svg",
    metadata: {
      engraving: { text: "For Dad, 2026", font: "serif" },
    },
  } as unknown as StoreCartLineItem;
  it("shows the engraving and the actual price in the cart", () => {
    const html = renderToStaticMarkup(
      createElement(CartItem, {
        item,
        currencyCode: "USD",
        onUpdateQuantity: () => {},
        onRemove: () => {},
        isUpdating: false,
      }),
    );
    expect(html).toContain("For Dad, 2026");
    expect(html).toContain("Roman Serif");
    expect(html).toContain("$334.62");
  });
  it("allows checkout before an address is entered and disables navigation during changes", () => {
    const props = {
      cart: { id: "cart_test", shipping_methods: [] } as unknown as StoreCart,
      subtotal: 334.62,
      shipping: null,
      tax: 0,
      discount: 0,
      total: 334.62,
      currencyCode: "USD",
      itemCount: 1,
      isLoading: false,
    };
    const ready = renderToStaticMarkup(createElement(OrderSummary, props));
    expect(ready).toContain('href="/checkout"');
    expect(ready).toContain("Calculated at checkout");
    expect(ready).not.toContain("Select Delivery to Checkout");
    const busy = renderToStaticMarkup(
      createElement(OrderSummary, { ...props, isLoading: true }),
    );
    expect(busy).not.toContain('href="/checkout"');
  });
  it("does not publish seeded customer ratings as verified reviews", () => {
    const product = {
      id: "prod_test",
      handle: "meridian-automatic",
      title: "Meridian Automatic",
      metadata: { rating: 4.8, review_count: 156 },
      variants: [{ calculated_price: { calculated_amount: 334.62 } }],
    } as unknown as StoreProduct;
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product, regionCurrency: "USD" }),
    );
    expect(html).toContain("$334.62");
    expect(html).not.toContain("4.8");
    expect(html).not.toContain("(156)");
  });
});
