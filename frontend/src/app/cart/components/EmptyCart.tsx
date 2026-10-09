import { portraitStylesUrl } from "@/lib/portrait";
import { ShoppingBagIcon } from "./utils";

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-cream-light px-6 py-20 text-center shadow-[0_4px_20px_rgba(38,34,30,0.05)]">
      <div className="text-toffee mb-6">
        <ShoppingBagIcon />
      </div>
      <h2 className="font-serif text-3xl text-charcoal mb-3">
        Your Cart Is Empty
      </h2>
      <p className="text-charcoal-light text-center max-w-md mb-8">
        Explore our portrait style concepts and prepare your reference.
        Commissions are in preparation.
      </p>
      <a
        href={portraitStylesUrl}
        className="rounded-full bg-toffee text-white px-8 py-3.5 hover:bg-toffee-dark transition-colors font-bold uppercase tracking-[0.18em] text-xs shadow-[0_8px_24px_rgba(176,141,79,0.30)]"
      >
        Explore Portrait Styles
      </a>
    </div>
  );
}
