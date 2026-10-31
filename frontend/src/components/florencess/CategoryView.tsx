import Link from "next/link";
import CatalogCard from "./CatalogCard";
import ListingToolbar from "./ListingToolbar";
import Pagination from "./Pagination";
import { type FlCategory, type FlProduct } from "@/lib/florencess-catalog";
import { paginateFl, parseFlListParams, sortFlProducts } from "@/lib/florencess-listing";

type Props = {
  category: FlCategory;
  products: FlProduct[];
  searchParams: Record<string, string | string[] | undefined>;
};

export default function CategoryView({ category, products, searchParams }: Props) {
  const params = parseFlListParams(searchParams);
  const sorted = sortFlProducts(products, params.sort);
  const page = paginateFl(sorted, params.page, params.limit);
  const basePath = `/${category.slug}`;

  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">{category.title}</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>{category.title}</li>
        </ol>
      </div>

      <div className="fl-container fl-listing">
        {page.total > 0 ? (
          <>
            <ListingToolbar basePath={basePath} params={params} />
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
              basePath={basePath}
              page={page.page}
              pageCount={page.pageCount}
              params={params}
            />
          </>
        ) : (
          <div className="fl-empty">
            <p>There are no products in this category.</p>
            <Link className="fl-empty__link" href="/new">
              Continue
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
