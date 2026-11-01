import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CatalogCard from "@/components/florencess/CatalogCard";
import ListingToolbar from "@/components/florencess/ListingToolbar";
import Pagination from "@/components/florencess/Pagination";
import { FL_CATALOG, flSearchProducts, type FlProduct } from "@/lib/florencess-catalog";
import { flListHref, paginateFl, parseFlListParams, sortFlProducts } from "@/lib/florencess-listing";
import { searchProducts, MedusaUnavailableError } from "@/lib/medusa";
import { getRequestRegion } from "@/lib/request-region";
import { mapMedusaProduct, medusaProductCurrency } from "@/lib/medusa-catalog";
import { SITE_NAME, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Search"),
  description: `Search the ${SITE_NAME} catalogue.`,
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value ?? "";

/**
 * Medusa matches first, then the local catalogue, deduplicated by slug. A
 * Medusa failure degrades to local-only results with a notice.
 */
async function mergedSearchResults(
  query: string,
  category: string | undefined,
  includeDescription: boolean,
): Promise<{ matches: FlProduct[]; degraded: boolean }> {
  const localMatches = query
    ? flSearchProducts(query, { category, includeDescription })
    : [];
  try {
    const region = await getRequestRegion();
    const products = query ? await searchProducts(query, region?.id) : [];
    const medusaMatches = products.map((product) =>
      mapMedusaProduct(product, medusaProductCurrency(product)),
    );
    const seen = new Set<string>();
    return {
      matches: [...medusaMatches, ...localMatches].filter((product) => {
        if (seen.has(product.slug)) return false;
        seen.add(product.slug);
        return true;
      }),
      degraded: false,
    };
  } catch (error) {
    if (!(error instanceof MedusaUnavailableError)) throw error;
    console.error("[medusa-catalog] degraded search listing", { query });
    return { matches: localMatches, degraded: true };
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = one(resolved.q).trim();
  const category = one(resolved.category);
  const includeDescription = one(resolved.description) === "1";
  const params = parseFlListParams(resolved);

  const { matches, degraded } = await mergedSearchResults(
    query,
    category || undefined,
    includeDescription,
  );
  const page = paginateFl(sortFlProducts(matches, params.sort), params.page, params.limit);
  const preserved = {
    q: query || undefined,
    category: category || undefined,
    description: includeDescription ? "1" : undefined,
  };
  if (page.page !== params.page) {
    redirect(flListHref("/search", { ...params, ...preserved, page: page.page }));
  }

  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Search</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Search</li>
        </ol>
      </div>

      <div className="fl-container">
        <form className="fl-form" action="/search" method="get" style={{ maxWidth: 720 }}>
          <div className="fl-form__row">
            <label className="fl-form__label" htmlFor="fl-search-q">
              Search Criteria
            </label>
            <input
              id="fl-search-q"
              className="fl-form__input"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search for products"
            />
          </div>

          <div className="fl-form__row">
            <label className="fl-form__label" htmlFor="fl-search-category">
              Category
            </label>
            <select
              id="fl-search-category"
              className="fl-form__select"
              name="category"
              defaultValue={category}
            >
              <option value="">All Categories</option>
              {FL_CATALOG.categories.map((entry) => (
                <option key={entry.slug} value={entry.slug}>
                  {entry.title}
                </option>
              ))}
            </select>
          </div>

          <div className="fl-form__row">
            <label>
              <input type="checkbox" name="description" value="1" defaultChecked={includeDescription} />{" "}
              Search in product descriptions
            </label>
          </div>

          <button className="fl-form__submit" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="fl-container fl-listing">
        {degraded ? (
          <p role="status" className="fl-catalog-notice">
            Some products could not be loaded.
          </p>
        ) : null}
        {!query ? (
          <div className="fl-empty">
            <p>Enter a keyword to search the catalogue.</p>
          </div>
        ) : page.total === 0 ? (
          <div className="fl-empty">
            <p>There is no product matching your search criteria.</p>
            <Link className="fl-empty__link" href="/new">
              Continue
            </Link>
          </div>
        ) : (
          <>
            <ListingToolbar basePath="/search" params={params} preserved={preserved} />
            <p className="fl-listing__count">
              Showing {page.from} to {page.to} of {page.total}
              {page.pageCount > 1 ? ` (${page.pageCount} Pages)` : ""}
            </p>
            <div className="fl-listing__grid">
              {page.items.map((product) => (
                <CatalogCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination
              basePath="/search"
              page={page.page}
              pageCount={page.pageCount}
              params={params}
              preserved={preserved}
            />
          </>
        )}
      </div>
    </>
  );
}
