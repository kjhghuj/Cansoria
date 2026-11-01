"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";

/**
 * Heart toggle for one product. Server-rendered cards embed this small client
 * island instead of becoming client components themselves; the button is
 * self-contained (no context renders a disabled no-op so old pages survive).
 * A rejected item is reported through a transient status message instead of
 * failing silently.
 */
export default function WishlistButton({
  slug,
  title,
  image,
  price,
}: {
  slug: string;
  title: string;
  image: string;
  price: string;
}) {
  const wishlist = useWishlist();
  const [rejected, setRejected] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const active = wishlist.has(slug);
  const label = active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`;

  return (
    <span className="fl-wish__wrap">
      <button
        type="button"
        className={`fl-wish${active ? " is-active" : ""}`}
        aria-pressed={active}
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const saved = wishlist.toggle({ slug, title, image, price });
          if (!saved) {
            setRejected(true);
            if (hideTimer.current) clearTimeout(hideTimer.current);
            hideTimer.current = setTimeout(() => setRejected(false), 4000);
          }
        }}
      >
        <Heart size={16} strokeWidth={1.6} fill={active ? "currentColor" : "none"} />
      </button>
      {rejected ? (
        <span role="status" className="fl-wish__status">
          This item could not be saved.
        </span>
      ) : null}
    </span>
  );
}
