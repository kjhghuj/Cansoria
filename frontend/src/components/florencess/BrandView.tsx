import Link from "next/link";
import type { FlBrand } from "@/lib/florencess-content";
import { flBrandListing } from "@/lib/florencess-brands";
import CatalogCard from "./CatalogCard";

/** Display only IDs directly captured on a manufacturer's own reference page. */
export default function BrandView({ brand }: { brand: FlBrand }) {
  const listing = flBrandListing(brand.slug);
  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">{brand.label}</h1>
      </div>
      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/brands">Brands</Link></li>
          <li>{brand.label}</li>
        </ol>
      </div>
      <div className="fl-container fl-listing">
        {listing && listing.products.length > 0 ? (
          <>
            <p className="fl-listing__count">
              Showing {listing.products.length} captured products
              {listing.sourceTotal !== null ? ` from ${listing.sourceTotal} on the reference site` : ""}.
              {listing.sourceTotal !== null && listing.sourceTotal > listing.productIds.length
                ? " Remaining reference pages have not been captured."
                : ""}
            </p>
            <div className="fl-listing__grid">
              {listing.products.map((product) => <CatalogCard key={product.id} product={product} />)}
            </div>
          </>
        ) : (
          <div className="fl-empty" role="status">
            <p>{listing?.sourceTotal === 0
              ? `The captured reference page lists no products for ${brand.label}.`
              : `Products for ${brand.label} have not yet been verified in this catalogue.`}</p>
            {listing && listing.productIds.length > 0 && (
              <p>Verified reference IDs are not present in the local product catalogue.</p>
            )}
            <Link className="fl-empty__link" href="/brands">Browse all brands</Link>
          </div>
        )}
      </div>
    </>
  );
}
