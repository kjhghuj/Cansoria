"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Menu, Search, User, X } from "lucide-react";
import { FL_BRAND, FL_NAV } from "@/lib/florencess-data";
import CurrencySwitcher from "./CurrencySwitcher";
import MegaMenu from "./MegaMenu";
import MiniCart from "./MiniCart";

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="fl-header">
        <div className="fl-container">
          <div className="fl-header__bar">
            <div className="fl-header__left">
              <button
                type="button"
                className="fl-iconbtn fl-nav__mobile-toggle"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} strokeWidth={1.4} />
              </button>
              <button
                type="button"
                className="fl-iconbtn"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search size={17} strokeWidth={1.4} />
              </button>
              <span className="fl-account">
                <Link href="/account">Account</Link>
                <Link href="/account/login">Login</Link>
                <Link href="/register">Register</Link>
              </span>
            </div>

            <Link href="/" className="fl-logo" aria-label={FL_BRAND}>
              {FL_BRAND}
            </Link>

            <div className="fl-header__right">
              <CurrencySwitcher />
              <Link href="/wishlist.html" className="fl-iconbtn" aria-label="Wishlist">
                <Heart size={17} strokeWidth={1.4} />
              </Link>
              <Link href="/account" className="fl-iconbtn" aria-label="My account">
                <User size={17} strokeWidth={1.4} />
              </Link>
              <MiniCart />
            </div>
          </div>
        </div>

        {/* The reference keeps a permanent search row under the mobile bar. */}
        <div className="fl-header__msearch">
          <form action="/search" method="get" role="search">
            <input
              type="search"
              name="q"
              placeholder="What are you looking for?"
              aria-label="Search products"
            />
            <button type="submit" aria-label="Search">
              <Search size={16} strokeWidth={1.4} />
            </button>
          </form>
        </div>

        <nav className="fl-nav" aria-label="Main">
          <div className="fl-container">
            <ul className="fl-nav__list">
              {FL_NAV.map((group) =>
                group.columns ? (
                  <MegaMenu group={group} key={group.label} />
                ) : (
                  <li className="fl-nav__item" key={group.label}>
                    <Link className="fl-nav__link" href={group.href}>
                      {group.label}
                    </Link>
                    {group.children ? (
                      <div className="fl-nav__panel">
                        <span className="fl-nav__panel-title">{group.label}</span>
                        {group.children.map((child) => (
                          <Link key={child.label} href={child.href}>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ),
              )}
            </ul>
          </div>
        </nav>
      </header>

      {/* mobile drawer */}
      <div
        className={`fl-scrim${drawerOpen ? " is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside className={`fl-drawer${drawerOpen ? " is-open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="fl-drawer__head">
          <span className="fl-logo" style={{ fontSize: 16 }}>
            {FL_BRAND}
          </span>
          <button
            type="button"
            className="fl-drawer__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        {FL_NAV.map((group) => (
          <div className="fl-drawer__group" key={`m-${group.label}`}>
            <Link href={group.href} onClick={() => setDrawerOpen(false)}>
              {group.label}
            </Link>
            {group.columns ? (
              <div className="fl-drawer__sub">
                {group.columns.map((column) => (
                  <div className="fl-drawer__column" key={`m-${group.label}-${column.title}`}>
                    <span className="fl-drawer__column-title">{column.title}</span>
                    {column.links.map((link) => (
                      <Link
                        key={`m-${group.label}-${column.title}-${link.label}`}
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ) : group.children ? (
              <div className="fl-drawer__sub">
                {group.children.map((child) => (
                  <Link
                    key={`m-${group.label}-${child.label}`}
                    href={child.href}
                    onClick={() => setDrawerOpen(false)}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div className="fl-drawer__group">
          <Link href="/account" onClick={() => setDrawerOpen(false)}>
            My Account
          </Link>
        </div>
        <div className="fl-drawer__group">
          <CurrencySwitcher surface="drawer" />
        </div>
      </aside>

      {/* search overlay */}
      <div className={`fl-search${searchOpen ? " is-open" : ""}`} aria-hidden={!searchOpen}>
        <div className="fl-container">
          <form
            className="fl-search__inner"
            action="/search"
            method="get"
            onSubmit={() => setSearchOpen(false)}
          >
            <Search size={18} strokeWidth={1.4} />
            <input
              className="fl-search__input"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you looking for?"
              aria-label="Search products"
            />
            <button
              type="button"
              className="fl-search__close"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
