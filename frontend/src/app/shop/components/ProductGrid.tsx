import { ProductCard } from "@/components";
import { StoreProduct, StoreRegion } from "@/lib/types";

interface ProductGridProps {
  products: StoreProduct[];
  region: StoreRegion | null;
  category?: string;
}

export function ProductGrid({ products, region, category }: ProductGridProps) {
  return (
    <div className="mx-auto mt-10 max-w-[1400px] px-4 sm:px-6 lg:px-8">
      {products.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              regionCurrency={region?.currency_code?.toUpperCase() || "GBP"}
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-2xl border border-charcoal/10 bg-warm-ivory px-6 py-16 text-center sm:px-10">
          <p className="mb-3 font-serif text-3xl text-charcoal">
            {category
              ? `${category} pieces are being curated.`
              : "The gallery is being curated."}
          </p>
          <p className="mx-auto max-w-md text-sm leading-7 text-charcoal-light">
            New hand-painted canvases and custom painting options will appear
            here as soon as they are available in Medusa.
          </p>
        </div>
      )}
    </div>
  );
}
