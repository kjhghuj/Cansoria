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
              Featured Paintings
            </h2>
            <p className="text-charcoal-light text-sm sm:text-base font-light leading-relaxed">
              Browse selected custom-ready canvases and hand-painted artwork
              from the current collection.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-xs uppercase tracking-widest border-b border-charcoal pb-1 hover:text-terracotta hover:border-terracotta transition-colors"
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
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-center border-y border-border py-10 lg:py-14">
              <div className="relative aspect-[4/3] bg-white overflow-hidden border border-border">
                <Image
                  src="/products/canvas.svg"
                  alt="Cansoria canvas artwork placeholder"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 35vw"
                />
              </div>
              <div className="max-w-2xl">
                <h3 className="font-serif text-2xl lg:text-4xl text-charcoal mb-4">
                  The collection is being prepared.
                </h3>
                <p className="text-charcoal-light font-light leading-relaxed mb-7">
                  Connect your Medusa catalog to feature available paintings
                  here. The homepage remains ready for custom orders and
                  category browsing while products are being curated.
                </p>
                <Link
                  href="/shop?category=custom-painting"
                  className="inline-flex bg-terracotta text-white px-7 py-3 text-xs uppercase tracking-widest font-bold hover:bg-terracotta-dark transition-colors"
                >
                  Start a Custom Painting
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
