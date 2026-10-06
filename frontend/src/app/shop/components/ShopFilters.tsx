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
      <div className="border-y border-border bg-cream-card/60 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateFilter("category", null)}
              aria-pressed={!currentCategory}
              className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.22em] transition-all ${
                !currentCategory
                  ? "bg-toffee text-white shadow-[0_4px_16px_rgba(176,141,79,0.30)]"
                  : "border border-transparent bg-cream-dark/60 text-charcoal hover:bg-cream-dark hover:text-toffee"
              }`}
            >
              All Pet Portraits
            </button>
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => updateFilter("category", cat.value)}
                aria-pressed={currentCategory === cat.value}
                className={`rounded-full px-5 py-2 text-[11px] uppercase tracking-[0.22em] transition-all ${
                  currentCategory === cat.value
                    ? "bg-toffee text-white shadow-[0_4px_16px_rgba(176,141,79,0.30)]"
                    : "border border-transparent bg-cream-dark/60 text-charcoal hover:bg-cream-dark hover:text-toffee"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] text-charcoal-light">
              {productCount} {productCount === 1 ? "portrait" : "portraits"}
            </span>
            <select
              value={currentSort || "featured"}
              onChange={(event) =>
                updateFilter(
                  "sort",
                  event.target.value === "featured" ? null : event.target.value
                )
              }
              className="rounded-full border border-border bg-white px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-charcoal outline-none transition-colors focus:border-toffee"
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
