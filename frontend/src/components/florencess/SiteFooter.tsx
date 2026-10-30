"use client";

import Link from "next/link";
import { useState } from "react";
import { FL_BRAND, FL_FOOTER_COLUMNS, FL_LOCALES, FL_SOCIALS } from "@/lib/florencess-data";

/**
 * Footer stack mirrors the reference theme's rows:
 * link columns, the country/currency selector, an empty 25px spacer, the
 * copyright line and the company line. The reference keeps no separate policy
 * menu row — those links live inside the columns.
 */
export default function SiteFooter() {
  const [locale, setLocale] = useState(0);
  const current = FL_LOCALES[locale];

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
          <span className="fl-footer__flag">{current.flag}</span>
          <select
            aria-label="Ship to country"
            value={locale}
            onChange={(e) => setLocale(Number(e.target.value))}
            style={{
              border: 0,
              background: "transparent",
              font: "inherit",
              fontSize: 12,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {FL_LOCALES.map((l, i) => (
              <option value={i} key={l.country}>
                {l.country} — {l.currency}
              </option>
            ))}
          </select>
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

        <div className="fl-footer__company">
          Tianjin Xigucheng Educational Technology Co., Ltd.
        </div>
      </div>
    </footer>
  );
}
