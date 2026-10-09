import type { Metadata } from "next";
import { portraitStylesUrl } from "@/lib/portrait";
import ProductCard from "@/components/ProductCard";
import { getRegion, searchProducts } from "@/lib/medusa";

export const metadata: Metadata = {
  title: "Search | Cansoria",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim().slice(0, 200) ?? "";
  const region = await getRegion("gb");
  const products =
    query.length >= 2 && region ? await searchProducts(query, region.id) : [];
  return (
    <div className="min-h-screen bg-cream px-4 pb-16 pt-28 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="mb-6 font-serif text-4xl text-charcoal">
          Search the studio
        </h1>
        <form action="/search" className="mb-10 flex gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            aria-label="Search products"
            minLength={2}
            maxLength={200}
            required
            placeholder="Search pet portraits"
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-4 py-3"
          />
          <button
            type="submit"
            className="rounded-full bg-toffee px-6 py-3 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>
        {products.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-charcoal-light">
              {products.length} results for “{query}”
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  regionCurrency={region?.currency_code?.toUpperCase() ?? "GBP"}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-cream-light p-8">
            <p className="mb-4 text-charcoal-light">
              {query.length < 2
                ? "Enter at least two characters to search."
                : `No products found for “${query}”. Try “pet portrait”.`}
            </p>
            <a href={portraitStylesUrl} className="text-toffee underline">
              Explore Pet Portraits →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
