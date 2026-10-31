"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FlProduct } from "@/lib/florencess-catalog";

type RecentEntry = { slug: string; title: string; price: string; image: string };

const STORAGE_KEY = "fl-recently-viewed";
const LIMIT = 8;

function MiniCard({ entry }: { entry: RecentEntry }) {
  return (
    <article className="fl-catalog-card">
      <Link className="fl-catalog-card__media" href={`/${entry.slug}`} aria-label={entry.title}>
        {entry.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="fl-catalog-card__img"
            src={entry.image}
            alt={entry.title}
            loading="lazy"
            width={600}
            height={600}
          />
        ) : null}
      </Link>
      <div className="fl-catalog-card__body">
        <Link className="fl-catalog-card__name" href={`/${entry.slug}`}>
          {entry.title}
        </Link>
        <div className="fl-catalog-card__price">
          <span>{entry.price}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * "Recently Viewed" / "You Might Also Like" tab strip, mirroring the reference
 * PDP. Recent history is the visitor's own browser storage; the recommendation
 * list is the server-rendered same-category selection, so nothing is invented.
 */
export default function ProductTabs({
  product,
  related,
}: {
  product: FlProduct;
  related: FlProduct[];
}) {
  const [tab, setTab] = useState<"recent" | "related">("related");
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  useEffect(() => {
    let parsed: RecentEntry[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      parsed = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    } catch {
      parsed = [];
    }
    const entry: RecentEntry = {
      slug: product.slug,
      title: product.title,
      price: product.price,
      image: product.localImages[0]?.src || "",
    };
    const next = [entry, ...parsed.filter((item) => item.slug !== product.slug)].slice(0, LIMIT);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage may be unavailable in private mode; the tab still renders.
    }
    const visibleRecent = parsed.filter((item) => item.slug !== product.slug);
    const timer = window.setTimeout(() => setRecent(visibleRecent), 0);
    return () => window.clearTimeout(timer);
  }, [product.slug, product.title, product.price, product.localImages]);

  const tabs = [
    { id: "recent" as const, label: "Recently Viewed", items: recent },
    { id: "related" as const, label: "You Might Also Like", items: related.map(toEntry) },
  ];
  const active = tabs.find((entry) => entry.id === tab) ?? tabs[1];

  return (
    <section className="fl-related">
      <div role="tablist" aria-label="Product suggestions" className="fl-pagination" style={{ justifyContent: "center", marginBottom: 26 }}>
        {tabs.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            type="button"
            aria-selected={entry.id === tab}
            className="fl-pagination__item"
            style={entry.id === tab ? { background: "var(--fl-ink)", color: "#fff", borderColor: "var(--fl-ink)" } : undefined}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active.items.length ? (
          <div className="fl-listing__grid">
            {active.items.map((entry) => (
              <MiniCard key={entry.slug} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="fl-listing__count" style={{ textAlign: "center" }}>
            {active.id === "recent"
              ? "You have not viewed any other product yet."
              : "No related products in this category."}
          </p>
        )}
      </div>
    </section>
  );
}

function toEntry(product: FlProduct): RecentEntry {
  return {
    slug: product.slug,
    title: product.title,
    price: product.price,
    image: product.localImages[0]?.src || "",
  };
}
