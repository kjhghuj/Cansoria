import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components";
import { StoreProduct, StoreRegion } from "@/lib/types";

interface FeaturedProductsProps {
  products: StoreProduct[];
  region: StoreRegion | null;
}

export function FeaturedProducts({ products, region }: FeaturedProductsProps) {
  const currency = region?.currency_code?.toUpperCase() || "GBP";

  return (
    <section className="py-20 lg:py-28 bg-cream">
      <div className="max-w-[1400px] mx-auto">
        <div className="px-6 lg:px-8 mb-10 lg:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal mb-3">
              Most Cherished Pet Portraits
            </h2>
            <p className="text-charcoal-light text-sm sm:text-base font-light leading-relaxed">
              Hand-painted oil portraits curated by popular canvas sizes and
              framing styles.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-xs uppercase tracking-widest border-b border-charcoal pb-1 hover:text-toffee hover:border-toffee transition-colors whitespace-nowrap"
          >
            View All
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="flex lg:grid lg:grid-cols-4 gap-6 overflow-x-auto lg:overflow-visible px-6 lg:px-8 pb-8 no-scrollbar snap-x snap-mandatory">
            {products.map((product) => (
              <div key={product.id} className="min-w-[280px] lg:min-w-0 snap-center">
                <ProductCard product={product} regionCurrency={currency} />
              </div>
            ))}
            <div className="min-w-[20px] lg:hidden" />
          </div>
        ) : (
          <div className="px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-center rounded-2xl border border-border-subtle bg-cream-light py-10 lg:py-14 px-6 lg:px-10">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_10px_32px_rgba(38,34,30,0.12)]">
                <Image
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=900"
                  alt="Hand-painted golden retriever oil portrait on canvas"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 35vw"
                />
              </div>
              <div className="max-w-2xl">
                <h3 className="font-serif text-2xl lg:text-4xl text-charcoal mb-4">
                  Your companion&rsquo;s portrait starts with a single photo.
                </h3>
                <p className="text-charcoal-light font-light leading-relaxed mb-7">
                  Commission a museum-grade, hand-painted oil portrait of your
                  dog, cat, or whole furry family. Every order begins with a
                  free sketch proof — revise it until it melts your heart
                  before anything ships.
                </p>
                <Link
                  href="/shop?category=pet-portraits"
                  className="inline-flex bg-toffee text-white px-7 py-3.5 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-toffee-dark transition-colors shadow-[0_8px_22px_rgba(200,122,62,0.30)]"
                >
                  Commission Your Pet Portrait
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
