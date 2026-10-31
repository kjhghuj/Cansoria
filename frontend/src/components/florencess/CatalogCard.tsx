import Link from "next/link";
import { flHasVerifiedDiscount, type FlProduct } from "@/lib/florencess-catalog";

/**
 * Listing tile: square media with a hover second image, discount label,
 * centred name and price pair. The reference also renders a description line
 * and cart buttons; the description is included, the buttons are not, because
 * no catalogue product has a Medusa variant mapping yet (see
 * florencess-variants.ts) and a non-functional cart button would fake stock.
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
          <span>{product.price}</span>
          {discounted && product.oldPrice ? (
            <span className="fl-catalog-card__price-old">{product.oldPrice}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
