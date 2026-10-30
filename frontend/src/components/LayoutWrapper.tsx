"use client";

import { useCart } from "@/lib/providers";
import Header from "./florencess/Header";
import RecentPurchase from "./florencess/RecentPurchase";
import SiteFooter from "./florencess/SiteFooter";
import TopMarquee from "./florencess/TopMarquee";

interface LayoutWrapperProps {
  children: React.ReactNode;
  /** Kept for API compatibility with the root layout. */
  chatEnabled?: boolean;
}

/**
 * FLORENCESS storefront shell: marquee → sticky header/nav → page → footer.
 * The shell is intentionally theme-agnostic so inner pages keep working.
 */
export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { cartCount } = useCart();

  return (
    <div className="fl-root flex min-h-screen flex-col">
      <TopMarquee />
      <Header cartCount={cartCount} />
      <main className="flex-grow">{children}</main>
      <SiteFooter />
      <RecentPurchase />
    </div>
  );
}
