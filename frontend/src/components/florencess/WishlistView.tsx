"use client";

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist-context";

/**
 * Wishlist grid. Prices are snapshots from add time; the note keeps that
 * honest. The list renders entirely from the wishlist context.
 */
export default function WishlistView() {
  const { items, remove, saveError } = useWishlist();

  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Wishlist{items.length ? ` (${items.length})` : ""}</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Wishlist</li>
        </ol>
      </div>

      <div className="fl-container fl-listing">
        {saveError ? (
          <p role="alert" className="fl-catalog-notice">
            Your wishlist could not be saved to your account.
          </p>
        ) : null}

        {items.length === 0 ? (
          <div className="fl-empty">
            <p>Your wishlist is empty.</p>
            <Link className="fl-empty__link" href="/new">
              Continue
            </Link>
          </div>
        ) : (
          <>
            <p className="fl-wishlist__note">Prices may have changed.</p>
            <div className="fl-listing__grid">
              {items.map((item) => (
                <article className="fl-catalog-card" key={item.slug}>
                  <Link className="fl-catalog-card__media" href={`/${item.slug}`} aria-label={item.title}>
                    {item.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        className="fl-catalog-card__img"
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        width={600}
                        height={600}
                      />
                    ) : (
                      <span className="fl-wishlist__noimage" aria-hidden="true" />
                    )}
                  </Link>
                  <div className="fl-catalog-card__body">
                    <Link className="fl-catalog-card__name" href={`/${item.slug}`}>
                      {item.title}
                    </Link>
                    {item.price ? (
                      <div className="fl-catalog-card__price">
                        <span>{item.price}</span>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="fl-wishlist__remove"
                      onClick={() => remove(item.slug)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
