import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  getCategories,
  getProducts,
  getRegion,
  getStoreOrdersOpen,
  MedusaUnavailableError,
} from "@/lib/medusa";
import { DEFAULT_CURRENCY_CODE } from "@/lib/market";
import { STUDIO, STUDIO_OPEN } from "@/lib/studio-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Watches | Cansoria",
    description:
      "Browse the Cansoria watch collections — dress, dive, chronograph, automatic and everyday models in your size, strap and dial.",
    alternates: { canonical: "/shop" },
  };
}

type SortKey = "featured" | "title" | "price-asc" | "price-desc";
type ProductList = Awaited<ReturnType<typeof getProducts>>["products"];

function lowestPrice(product: ProductList[number]) {
  const prices = (product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number");
  return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

function sortProducts(products: ProductList, sort: SortKey): ProductList {
  const copy = [...products];
  if (sort === "title") {
    copy.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sort === "price-asc" || sort === "price-desc") {
    copy.sort((a, b) => {
      const delta = lowestPrice(a) - lowestPrice(b);
      return sort === "price-asc" ? delta : -delta;
    });
  }
  return copy;
}

function UnavailablePanel() {
  return (
    <div className="studio-page bg-cream min-h-screen pt-24 pb-16">
      <div className="studio-container max-w-xl text-center">
        <h1>The store is temporarily unavailable</h1>
        <p className="mt-4 text-charcoal-light leading-relaxed">
          We could not reach the store service. This is temporary — please
          refresh the page or try again in a moment.
        </p>
        <a href="/shop" className="studio-button mt-8">
          Try again
        </a>
      </div>
    </div>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const sort: SortKey =
    params.sort === "title" || params.sort === "price-asc" || params.sort === "price-desc"
      ? params.sort
      : "featured";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const query = params.q?.trim().slice(0, 100) ?? "";
  const categoryHandle = params.category?.trim() || "";

  // Data fetching and rendering are kept apart: an outage renders the
  // unavailable panel below, never an empty product grid.
  let region: Awaited<ReturnType<typeof getRegion>> = null;
  let ordersOpen = false;
  let catalog: { products: ProductList } | null = null;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let unavailable = false;
  try {
    region = await getRegion();
    // getStoreOrdersOpen resolves false on outage; the catalog fetch below
    // is the loud failure signal.
    const [open, listed, cats] = await Promise.all([
      getStoreOrdersOpen().catch(() => false),
      getProducts(region?.id, 500),
      getCategories(),
    ]);
    ordersOpen = open;
    catalog = listed;
    categories = cats;
  } catch (error) {
    if (error instanceof MedusaUnavailableError) {
      unavailable = true;
    } else {
      throw error;
    }
  }

  if (unavailable || !catalog) return <UnavailablePanel />;

  const activeCategory =
    categories.find((category) => category.handle === categoryHandle) ?? null;

  let products: ProductList = catalog.products;
  if (activeCategory) {
    const id = activeCategory.id;
    products = products.filter((product) =>
      (product.categories ?? []).some((category) => category.id === id),
    );
  }
  if (query.length >= 2) {
    const lower = query.toLowerCase();
    products = products.filter((product) =>
      `${product.title ?? ""} ${product.subtitle ?? ""} ${product.handle ?? ""}`
        .toLowerCase()
        .includes(lower),
    );
  }
  products = sortProducts(products, sort);

  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = products.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const currencyCode = region?.currency_code?.toUpperCase() ?? DEFAULT_CURRENCY_CODE;

  const pageLink = (next: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      category: categoryHandle || undefined,
      q: query || undefined,
      sort: sort === "featured" ? undefined : sort,
      page: undefined,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    const qs = search.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="studio-page bg-cream min-h-screen pb-20">
      <div className="studio-container">
        <div className="pt-12 pb-8 border-b border-border">
          <p className="studio-eyebrow">The Collections</p>
          <h1>Watches</h1>
          <p className="mt-4 max-w-xl text-charcoal-light leading-relaxed">
            {ordersOpen ? STUDIO_OPEN.description : STUDIO.description}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 py-6" role="navigation" aria-label="Collection filters">
          <Link
            href={pageLink({ category: undefined, page: undefined })}
            aria-current={!activeCategory ? "page" : undefined}
            className={`inline-flex min-h-10 items-center border px-4 py-2 text-sm ${
              !activeCategory ? "border-charcoal bg-charcoal text-white" : "border-border bg-white text-charcoal hover:border-charcoal"
            }`}
          >
            All
          </Link>
          {categories.map((category) => {
            const active = activeCategory?.id === category.id;
            return (
              <Link
                key={category.id}
                href={pageLink({ category: category.handle, page: undefined })}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center border px-4 py-2 text-sm ${
                  active ? "border-charcoal bg-charcoal text-white" : "border-border bg-white text-charcoal hover:border-charcoal"
                }`}
              >
                {category.name}
              </Link>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-sm text-charcoal-light">
            <span className="hidden sm:inline">Sort</span>
            {(
              [
                ["featured", "Featured"],
                ["title", "A–Z"],
                ["price-asc", "Price ↑"],
                ["price-desc", "Price ↓"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Link
                key={key}
                href={pageLink({ sort: key === "featured" ? undefined : key, page: undefined })}
                aria-current={sort === key ? "page" : undefined}
                className={`px-3 py-2 ${sort === key ? "text-charcoal underline underline-offset-4" : "hover:text-charcoal"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {visible.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} regionCurrency={currencyCode} />
              ))}
            </div>
            {pageCount > 1 && (
              <nav className="mt-10 flex items-center justify-between text-sm" aria-label="Pagination">
                {currentPage > 1 ? (
                  <Link href={pageLink({ page: String(currentPage - 1) })} className="border border-charcoal px-5 py-2.5 min-h-10 inline-flex items-center">
                    ← Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-charcoal-light">
                  Page {currentPage} of {pageCount}
                </span>
                {currentPage < pageCount ? (
                  <Link href={pageLink({ page: String(currentPage + 1) })} className="border border-charcoal px-5 py-2.5 min-h-10 inline-flex items-center">
                    Next →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="border border-border bg-cream-card p-10 text-center">
            <h2 className="text-xl text-charcoal mb-2">
              {query ? `No watches match “${query}”` : "No watches in this collection yet"}
            </h2>
            <p className="text-charcoal-light">
              Try another collection or{" "}
              <Link href="/contact" className="underline">
                contact the studio
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
