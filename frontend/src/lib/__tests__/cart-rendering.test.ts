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
    product_title: "Pet Portrait",
    unit_price: 85.02,
    quantity: 1,
    total: 85.02,
    thumbnail: "/products/generic.svg",
    metadata: {
      portrait: { style: "dark-classic", photo_name: "reference.webp" },
    },
  } as unknown as StoreCartLineItem;
  it("shows the selected portrait style and the actual price in the cart", () => {
    const html = renderToStaticMarkup(
      createElement(CartItem, {
        item,
        currencyCode: "GBP",
        onUpdateQuantity: () => {},
        onRemove: () => {},
        isUpdating: false,
      }),
    );
    expect(imageSources(html)).toContain("/images/pet-oil/dark-classic.webp");
    expect(html).toContain("Dark Classic");
    expect(html).toContain("reference.webp");
    expect(html).toContain("£85.02");
  });
  it("allows checkout before an address is entered and disables navigation during changes", () => {
    const props = {
      cart: { id: "cart_test", shipping_methods: [] } as unknown as StoreCart,
      subtotal: 85.02,
      shipping: null,
      tax: 0,
      discount: 0,
      total: 85.02,
      currencyCode: "GBP",
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
      handle: "pet-portrait-oil-painting",
      title: "Pet Portrait",
      metadata: { rating: 4.8, review_count: 156 },
      variants: [{ calculated_price: { calculated_amount: 85.02 } }],
    } as unknown as StoreProduct;
    const html = renderToStaticMarkup(
      createElement(ProductCard, { product, regionCurrency: "GBP" }),
    );
    expect(imageSources(html)).toContain("/images/pet-oil/classic-oil.webp");
    expect(html).toContain("£85.02");
    expect(html).not.toContain("4.8");
    expect(html).not.toContain("(156)");
  });
});
