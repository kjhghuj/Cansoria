"use client";

import { useState } from "react";
import { Navbar, Footer, SearchOverlay, ChatWidget, AnnouncementBar } from "@/components";
import { useCart, useRegion } from "@/lib/providers";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [navOffset, setNavOffset] = useState(0);
  const { cartCount } = useCart();
  const { region } = useRegion();

  return (
    <>
      <AnnouncementBar onHeightChange={setNavOffset} />
      <Navbar
        cartCount={cartCount}
        onSearchClick={() => setIsSearchOpen(true)}
        topOffset={navOffset}
      />
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        regionId={region?.id}
      />
      <main
        className="flex-grow transition-[padding]"
        style={{
          paddingTop: `${navOffset}px`,
          // @ts-expect-error - Custom CSS variable
          "--announcement-height": `${navOffset}px`
        }}
      >
        {children}
      </main>
      <ChatWidget />
      <Footer />
    </>
  );
}
