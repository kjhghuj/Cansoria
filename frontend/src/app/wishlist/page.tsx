import type { Metadata } from "next";
import WishlistView from "@/components/florencess/WishlistView";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Wishlist"),
  description: "Products you saved for later.",
  alternates: { canonical: "/wishlist" },
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistView />;
}
