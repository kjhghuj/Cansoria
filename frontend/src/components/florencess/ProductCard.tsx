import Link from "next/link";
import type { FlorencessProduct } from "@/lib/florencess-products";

/**
 * Product tile as rendered by the reference storefront's homepage shelves:
 * image (with a second image swapped in on hover), name and the price pair.
 * The reference keeps the discount label, "Ex Tax" line, quickview overlay
 * and cart buttons in the DOM but collapsed to 0x0, so none of them are
 * rendered visibly here.
 */
export default function ProductCard({ product }: { product: FlorencessProduct }) {
  return (
    <article className="fl-card">
      <Link className="fl-card__media" href={product.href} aria-label={product.name}>
        {product.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="fl-card__img"
              src={product.image}
              alt={product.name}
              loading="lazy"
            />
            {product.imageAlt ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className="fl-card__img fl-card__img--alt"
                src={product.imageAlt}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />
            ) : null}
          </>
        ) : null}
      </Link>

      <div className="fl-card__body">
        <Link className="fl-card__name" href={product.href}>
          {product.name}
        </Link>
        <div className="fl-card__price">
          <span>{product.price}</span>
          {product.oldPrice ? <span className="fl-card__price-old">{product.oldPrice}</span> : null}
        </div>
      </div>
    </article>
  );
}