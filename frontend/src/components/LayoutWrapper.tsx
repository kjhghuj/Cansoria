"use client";

import Header from "./florencess/Header";
import { MiniCartProvider } from "./florencess/MiniCartContext";
import RecentPurchase from "./florencess/RecentPurchase";
import ScrollTopButton from "./florencess/ScrollTopButton";
import SiteFooter from "./florencess/SiteFooter";
import TopMarquee from "./florencess/TopMarquee";

interface LayoutWrapperProps {
  children: React.ReactNode;
  /** Kept for API compatibility with the root layout. */
  chatEnabled?: boolean;
}

/**
 * LORENCESS storefront shell: marquee → sticky header/nav → page → footer.
 * The shell is intentionally theme-agnostic so inner pages keep working. The
 * mini cart state lives here so any add-to-cart action can open the panel.
 */
export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="fl-root flex min-h-screen flex-col">
      <MiniCartProvider>
        <TopMarquee />
        <Header />
        <main className="flex-grow">{children}</main>
        <SiteFooter />
        <RecentPurchase />
        <ScrollTopButton />
      </MiniCartProvider>
    </div>
  );
}
