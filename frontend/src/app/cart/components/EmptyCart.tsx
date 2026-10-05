import Link from "next/link";
import { ShoppingBagIcon } from "./utils";

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-white px-6 py-20 text-center">
      <div className="text-terracotta mb-6">
        <ShoppingBagIcon />
      </div>
      <h2 className="font-serif text-3xl text-charcoal mb-3">
        Your Cart Is Empty
      </h2>
      <p className="text-charcoal-light text-center max-w-md mb-8">
        Add a custom portrait, pet painting, or canvas artwork to begin your
        Cansoria order.
      </p>
      <Link
        href="/shop"
        className="bg-charcoal text-white px-8 py-3 hover:bg-oil-brown transition-colors font-medium uppercase tracking-[0.18em] text-xs"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
