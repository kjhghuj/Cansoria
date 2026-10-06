"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CreditCard } from "lucide-react";
import { COMPANY_INFO, FOOTER_LINKS } from "@/lib/constants";
import Newsletter from "./Newsletter";

interface MobileAccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function MobileAccordionItem({
  title,
  children,
  isOpen,
  onToggle,
}: MobileAccordionItemProps) {
  return (
    <div className="border-b border-border-subtle lg:border-none">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center py-4 text-left lg:py-0 lg:cursor-default lg:block"
      >
        <h5 className="uppercase tracking-widest text-xs font-bold text-charcoal lg:mb-6">
          {title}
        </h5>
        <ChevronDown
          size={16}
          className={`text-charcoal-light transition-transform lg:hidden ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 lg:h-auto lg:block ${
          isOpen ? "max-h-48 mb-4" : "max-h-0 lg:max-h-none"
        }`}
      >
        <ul className="space-y-3 text-sm text-charcoal-light">{children}</ul>
      </div>
    </div>
  );
}

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="bg-cream-card border-t border-border pt-16 pb-8">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          <div className="col-span-1 lg:col-span-1 mb-8 lg:mb-0">
            <span className="font-serif text-2xl tracking-[0.2em] text-charcoal font-bold block mb-6">
              CANSORIA
            </span>
            <p className="text-sm text-charcoal-light leading-relaxed max-w-xs">
              Museum-grade, 100% hand-painted oil portraits of the companions
              who make a house a home — dogs, cats, and every beloved pet.
              <br />
              <br />
              Custom-crafted on archival linen for pet families worldwide.
            </p>
          </div>

          <MobileAccordionItem
            title="Shop"
            isOpen={openSection === "Shop"}
            onToggle={() => toggleSection("Shop")}
          >
            {FOOTER_LINKS.shop.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-toffee transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </MobileAccordionItem>

          <MobileAccordionItem
            title="Support"
            isOpen={openSection === "Support"}
            onToggle={() => toggleSection("Support")}
          >
            {FOOTER_LINKS.support.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-toffee transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </MobileAccordionItem>

          <MobileAccordionItem
            title="Legal"
            isOpen={openSection === "Legal"}
            onToggle={() => toggleSection("Legal")}
          >
            {FOOTER_LINKS.legal.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-toffee transition-colors"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </MobileAccordionItem>

          <div className="col-span-1 lg:col-span-1">
            <Newsletter />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center pt-8 border-t border-border-subtle text-[10px] uppercase tracking-wider text-charcoal-muted gap-4">
          <div className="flex flex-col lg:flex-row items-center gap-4 text-center lg:text-left">
            <p>
              &copy; {new Date().getFullYear()} {COMPANY_INFO.name}. All rights
              reserved.
            </p>
            <p className="hidden lg:block">|</p>
            <p>{COMPANY_INFO.address}</p>
          </div>

          <div className="flex gap-3 text-charcoal-muted">
            <CreditCard size={20} />
            <div className="w-8 h-5 bg-cream border border-border rounded flex items-center justify-center font-bold text-[8px] text-charcoal-muted">
              VISA
            </div>
            <div className="w-8 h-5 bg-cream border border-border rounded flex items-center justify-center font-bold text-[8px] text-charcoal-muted">
              MC
            </div>
            <div className="w-8 h-5 bg-cream border border-border rounded flex items-center justify-center font-bold text-[8px] text-charcoal-muted">
              AMEX
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
