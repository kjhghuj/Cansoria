"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ShopCategoryOption {
  label: string;
  value: string;
}

interface ShopFiltersProps {
  categories: ShopCategoryOption[];
  currentCategory?: string;
  currentSort?: string;
  productCount: number;
}

export default function ShopFilters({
  categories,
  currentCategory,
  currentSort,
  productCount,
}: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    router.push(queryString ? `/shop?${queryString}` : "/shop");
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
      <div className="border-y border-charcoal/10 bg-canvas-beige/30 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter("category", null)}
              aria-pressed={!currentCategory}
              className={`border px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                !currentCategory
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-charcoal/15 bg-white/70 text-charcoal hover:border-muted-gold hover:text-muted-gold"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => updateFilter("category", cat.value)}
                aria-pressed={currentCategory === cat.value}
                className={`border px-4 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                  currentCategory === cat.value
                    ? "border-charcoal bg-charcoal text-white"
                    : "border-charcoal/15 bg-white/70 text-charcoal hover:border-muted-gold hover:text-muted-gold"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] text-charcoal-light">
              {productCount} {productCount === 1 ? "product" : "products"}
            </span>
            <select
              value={currentSort || "featured"}
              onChange={(event) =>
                updateFilter(
                  "sort",
                  event.target.value === "featured" ? null : event.target.value
                )
              }
              className="border border-charcoal/15 bg-white px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-charcoal outline-none transition-colors focus:border-muted-gold"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
