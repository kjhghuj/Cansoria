"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, User, Search } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

interface NavbarProps {
  cartCount: number;
  onSearchClick: () => void;
  topOffset?: number;
}

export default function Navbar({ cartCount, onSearchClick, topOffset = 0 }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Scroll effect for sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <nav
        style={{ top: `${topOffset}px` }}
        className={`fixed w-full z-40 transition-all duration-300 ${scrolled || isOpen
          ? "bg-[#FAF8F5]/90 backdrop-blur-md shadow-[0_2px_20px_rgba(38,34,30,0.06)] py-2"
          : "bg-transparent py-4"
          }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* LEFT: Mobile Menu / PC Logo */}
            <div className="flex-1 flex items-center justify-start">
              {/* Mobile Hamburger */}
              <div className="lg:hidden">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-charcoal p-2 -ml-2 hover:text-terracotta transition-colors"
                >
                  {isOpen ? (
                    <X size={24} strokeWidth={1} />
                  ) : (
                    <Menu size={24} strokeWidth={1} />
                  )}
                </button>
              </div>

              {/* PC Logo */}
              <div className="hidden lg:block">
                <Link
                  href="/"
                  className="font-serif text-2xl tracking-[0.2em] text-charcoal font-semibold hover:opacity-70 transition-opacity"
                >
                  CANSORIA
                </Link>
              </div>
            </div>

            {/* CENTER: Mobile Logo / PC Menu */}
            <div className="flex-1 flex items-center justify-center">
              {/* Mobile Logo */}
              <div className="lg:hidden">
                <Link
                  href="/"
                  className="font-serif text-xl tracking-[0.2em] text-charcoal font-semibold"
                >
                  CANSORIA
                </Link>
              </div>

              {/* PC Menu */}
              <div className="hidden lg:flex space-x-4 min-[1360px]:space-x-5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.name}
                    href={link.path}
                    className={`relative group text-[10px] uppercase tracking-[0.08em] text-charcoal font-medium py-2 whitespace-nowrap ${link.path.startsWith("/#") ? "hidden min-[1360px]:block" : ""
                      }`}
                  >
                    {link.name}
                    <span
                      className={`absolute left-0 bottom-0 h-[1px] bg-toffee transition-all duration-300 ${isActive(link.path) ? "w-full" : "w-0 group-hover:w-full"
                        }`}
                    ></span>
                  </Link>
                ))}
              </div>
            </div>

            {/* RIGHT: Icons & CTA */}
            <div className="flex-1 flex items-center justify-end space-x-4 xl:space-x-5">
              <button
                onClick={onSearchClick}
                aria-label="Search"
                className="text-charcoal hover:text-toffee transition-colors"
              >
                <Search size={20} strokeWidth={1.5} />
              </button>
              <Link
                href="/account"
                aria-label="My account"
                className="hidden sm:block text-charcoal hover:text-toffee transition-colors"
              >
                <User size={20} strokeWidth={1.5} />
              </Link>
              <Link
                href="/cart"
                aria-label="Cart"
                className="text-charcoal hover:text-toffee transition-colors relative"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-toffee text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link
                href="/shop?category=pet-portraits"
                className="hidden min-[1360px]:inline-flex items-center bg-toffee hover:bg-toffee-dark text-white px-4 min-[1440px]:px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold rounded-xl transition-colors whitespace-nowrap"
              >
                Start Custom Portrait
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        style={{ paddingTop: `calc(6rem + ${topOffset}px)` }}
        className={`fixed inset-0 z-30 bg-[#FAF8F5] px-6 transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col space-y-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={() => setIsOpen(false)}
              className="text-2xl font-serif text-charcoal hover:text-toffee transition-colors border-b border-border-subtle pb-4"
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/shop?category=pet-portraits"
            onClick={() => setIsOpen(false)}
            className="inline-flex justify-center items-center bg-toffee text-white px-7 py-4 text-xs uppercase tracking-widest font-bold rounded-xl hover:bg-toffee-dark transition-colors"
          >
            Start Custom Portrait
          </Link>
          <div className="pt-4">
            <h5 className="text-xs uppercase tracking-widest text-charcoal-muted mb-4">
              Account
            </h5>
            <div className="flex flex-col space-y-4 text-sm text-charcoal">
              <Link href="/account" onClick={() => setIsOpen(false)} className="text-left">
                My Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
