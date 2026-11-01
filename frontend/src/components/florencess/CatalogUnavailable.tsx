import Link from "next/link";

/**
 * Explicit outage state for catalogue routes backed by Medusa. Rendered
 * instead of a 404 whenever the backend is unreachable, so a temporary
 * failure never reads as "this product does not exist".
 */
export default function CatalogUnavailable({ slug }: { slug: string }) {
  return (
    <div className="fl-container">
      <div className="fl-empty">
        <h1 className="fl-empty__title">Catalogue unavailable</h1>
        <p>
          The catalogue is temporarily unavailable. Please try again shortly.
        </p>
        <Link className="fl-empty__link" href={`/${slug}`}>
          Try again
        </Link>
      </div>
    </div>
  );
}
