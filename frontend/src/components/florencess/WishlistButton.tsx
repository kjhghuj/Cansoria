"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";

/**
 * Heart toggle for one product. Server-rendered cards embed this small client
 * island instead of becoming client components themselves; the button is
 * self-contained (no context renders a disabled no-op so old pages survive).
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
  const active = wishlist.has(slug);
  const label = active ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`;

  return (
    <button
      type="button"
      className={`fl-wish${active ? " is-active" : ""}`}
      aria-pressed={active}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        wishlist.toggle({ slug, title, image, price });
      }}
    >
      <Heart size={16} strokeWidth={1.6} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
