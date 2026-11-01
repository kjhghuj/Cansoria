import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CatalogCard from "@/components/florencess/CatalogCard";
import ListingToolbar from "@/components/florencess/ListingToolbar";
import Pagination from "@/components/florencess/Pagination";
import { flDiscountedProducts } from "@/lib/florencess-catalog";
import { flListHref, paginateFl, parseFlListParams, sortFlProducts } from "@/lib/florencess-listing";
import { SITE_NAME, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Special Offers"),
  description: `Every discounted piece currently listed by ${SITE_NAME}.`,
  alternates: { canonical: "/special" },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpecialPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const params = parseFlListParams(resolved);
  const products = sortFlProducts(flDiscountedProducts(), params.sort);
  const page = paginateFl(products, params.page, params.limit);
  if (page.page !== params.page) {
    redirect(flListHref("/special", { ...params, page: page.page }));
  }

  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Special Offers</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Special Offers</li>
        </ol>
      </div>

      <div className="fl-container fl-listing">
        {page.total > 0 ? (
          <>
            <ListingToolbar basePath="/special" params={params} />
            <p className="fl-listing__count">
              Showing {page.from} to {page.to} of {page.total}
              {page.pageCount > 1 ? ` (${page.pageCount} Pages)` : ""}
            </p>
            <div className="fl-listing__grid">
              {page.items.map((product) => (
                <CatalogCard key={product.id} product={product} />
              ))}
            </div>
            <Pagination basePath="/special" page={page.page} pageCount={page.pageCount} params={params} />
          </>
        ) : (
          <div className="fl-empty">
            <p>No products are on offer right now.</p>
            <Link className="fl-empty__link" href="/new">
              Continue
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
