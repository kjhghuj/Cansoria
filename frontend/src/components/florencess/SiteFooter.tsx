"use client";

import Link from "next/link";
import { FL_BRAND, FL_FOOTER_COLUMNS, FL_SOCIALS } from "@/lib/florencess-data";
import { SITE_COMPANY_LINE } from "@/lib/brand";
import CurrencySwitcher from "./CurrencySwitcher";

/**
 * Footer stack mirrors the reference theme's rows:
 * link columns, the currency selector, an empty 25px spacer, the copyright
 * line and the company line. The reference keeps no separate policy menu row —
 * those links live inside the columns.
 */
export default function SiteFooter() {
  return (
    <footer className="fl-footer">
      <div className="fl-container">
        <div className="fl-footer__cols">
          {FL_FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="fl-footer__col-title">{col.title}</h3>
              <div className="fl-footer__links">
                {col.links.map((l) => (
                  <Link key={`${col.title}-${l.label}`} href={l.href}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="fl-footer__locale">
          <CurrencySwitcher surface="footer" />
          <span aria-hidden="true">▼</span>
        </div>

        <div className="fl-footer__spacer" aria-hidden="true" />

        <div className="fl-footer__legal">
          <span>
            © {new Date().getFullYear()} {FL_BRAND}. All Rights Reserved.
          </span>
          <span className="fl-footer__socials">
            {FL_SOCIALS.map((s) => (
              <Link key={`f-${s.label}`} href={s.href}>
                {s.label}
              </Link>
            ))}
          </span>
        </div>

        {SITE_COMPANY_LINE ? <div className="fl-footer__company">{SITE_COMPANY_LINE}</div> : null}
      </div>
    </footer>
  );
}
