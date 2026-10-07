"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import ExitIntentPopup from "./ExitIntentPopup";
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
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isGallery = pathname === "/shop";
  const isEditorial = isHome || isGallery;
  const offset = isEditorial ? 0 : navOffset;

  return (
    <>
      {!isEditorial && <AnnouncementBar onHeightChange={setNavOffset} />}
      <Navbar
        cartCount={cartCount}
        onSearchClick={() => setIsSearchOpen(true)}
        topOffset={offset}
        variant={isGallery ? "gallery" : "default"}
      />
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        regionId={region?.id}
      />
      <main
        className="flex-grow transition-[padding]"
        style={{
          paddingTop: `${offset}px`,
          // @ts-expect-error - Custom CSS variable
          "--announcement-height": `${offset}px`
        }}
      >
        {children}
      </main>
      {!isEditorial && <ChatWidget />}
      {!isEditorial && <ExitIntentPopup />}
      <Footer compact={isGallery} />
    </>
  );
}
