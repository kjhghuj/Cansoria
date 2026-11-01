import Link from "next/link";
import { flHasVerifiedDiscount, type FlProduct } from "@/lib/florencess-catalog";
import QuickViewButton from "./QuickViewButton";
import WishlistButton from "./WishlistButton";

/**
 * Listing tile: square media with a hover second image, discount label,
 * centred name and price pair. The wish toggle and quick-view trigger are
 * client islands layered over the media (never nested inside the card link).
 */
export default function CatalogCard({ product }: { product: FlProduct }) {
  const [primary, secondary] = product.localImages;
  const discounted = flHasVerifiedDiscount(product);
  return (
    <article className="fl-catalog-card">
      <Link
        className="fl-catalog-card__media"
        href={`/${product.slug}`}
        aria-label={product.title}
      >
        {discounted && product.discount ? (
          <span className="fl-catalog-card__label">{product.discount}</span>
        ) : null}
        {primary ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="fl-catalog-card__img"
              src={primary.src}
              alt={primary.alt || product.title}
              loading="lazy"
              width={600}
              height={600}
            />
            {secondary ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="fl-catalog-card__img fl-catalog-card__img--alt"
                src={secondary.src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                width={600}
                height={600}
              />
            ) : null}
          </>
        ) : null}
      </Link>
      <div className="fl-catalog-card__overlay">
        <WishlistButton
          slug={product.slug}
          title={product.title}
          image={primary?.src ?? "/"}
          price={product.price}
        />
      </div>
      <QuickViewButton slug={product.slug} />

      <div className="fl-catalog-card__body">
        {product.brand && product.brand !== product.title ? (
          <span className="fl-catalog-card__brand">{product.brand}</span>
        ) : null}
        <Link className="fl-catalog-card__name" href={`/${product.slug}`}>
          {product.title}
        </Link>
        {product.description ? (
          <p className="fl-catalog-card__desc">{product.description}</p>
        ) : null}
        <div className="fl-catalog-card__price">
          <span>{product.price || "Price unavailable"}</span>
          {discounted && product.oldPrice ? (
            <span className="fl-catalog-card__price-old">{product.oldPrice}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
