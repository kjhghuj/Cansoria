"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon, MagnifyingGlassIcon, ShoppingCartIcon, UserIcon, XIcon } from "@phosphor-icons/react";

interface NavbarProps { cartCount: number; onSearchClick: () => void; topOffset?: number; variant?: "default" | "gallery"; }
const navigationLinks = [
  { name: "Pet Portraits", href: "/shop" },
  { name: "Gallery", href: "/shop#styles" },
  { name: "How It Works", href: "/#process" },
  { name: "Our Artists", href: "/about" },
  { name: "Reviews", href: "/#reviews" },
  { name: "About", href: "/about" },
];
export default function Navbar({ cartCount, onSearchClick, topOffset = 0, variant = "default" }: NavbarProps) {
  const [menuState, setMenuState] = useState<{ path: string; mobile: boolean }>({ path: "", mobile: false });
  const pathname = usePathname();
  const mobileOpen = menuState.path === pathname && menuState.mobile;
  const closeMenus = () => setMenuState({ path: pathname, mobile: false });

  return (
    <header className={`portrait-navbar${variant === "gallery" ? " pet-oil-navbar" : ""}`} style={{ top: topOffset }} onKeyDown={event => { if (event.key === "Escape") closeMenus(); }}>
      <nav className="portrait-nav-inner" aria-label="Main navigation">
        <button type="button" className="portrait-mobile-toggle portrait-icon-button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMenuState({ path: pathname, mobile: !mobileOpen })}>{mobileOpen ? <XIcon weight="light" /> : <ListIcon weight="light" />}</button>
        <Link href="/" className="portrait-wordmark" onClick={closeMenus}>CANSORIA</Link>
        <div className="portrait-desktop-navigation">
          {navigationLinks.map(link => (
            <Link key={link.name} href={link.href} onClick={closeMenus}>{link.name}</Link>
          ))}
        </div>
        <div className="portrait-nav-actions">
          <button type="button" className="portrait-icon-button" aria-label="Search" onClick={() => { closeMenus(); onSearchClick(); }}><MagnifyingGlassIcon weight="light" /></button>
          <Link href="/account" className="portrait-icon-button nav-account" aria-label="My account" onClick={closeMenus}><UserIcon weight="light" /></Link>
          <Link href="/cart" className="portrait-icon-button nav-cart" aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"} onClick={closeMenus}><ShoppingCartIcon weight="light" /><span className={`portrait-cart-count ${cartCount ? "has-items" : ""}`} aria-hidden="true">{cartCount > 0 ? cartCount : ""}</span></Link>
        </div>
      </nav>
      {mobileOpen && (
        <nav className="portrait-mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation">
          {navigationLinks.map(link => (
            <Link key={link.name} href={link.href} onClick={closeMenus}>{link.name}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
