"use client";

import { useEffect, useState } from "react";
import { FL_RECENT_PURCHASES } from "@/lib/florencess-data";

const THUMBS = [
  "/florencess/img/p20a.webp",
  "/florencess/img/p09a.webp",
  "/florencess/img/p10a.webp",
  "/florencess/img/p14a.webp",
];

/**
 * Social-proof toast in the bottom-left corner: slides in, dwells, slides out,
 * then advances to the next purchase. Disabled on small screens (CSS).
 */
export default function RecentPurchase() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let alive = true;
    let hideTimer: number | undefined;

    const show = window.setTimeout(() => {
      if (!alive) return;
      setOpen(true);
      hideTimer = window.setTimeout(() => {
        if (!alive) return;
        setOpen(false);
        window.setTimeout(() => {
          if (!alive) return;
          setIndex((p) => (p + 1) % FL_RECENT_PURCHASES.length);
        }, 900);
      }, 6500);
    }, 4200);

    return () => {
      alive = false;
      window.clearTimeout(show);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [index, dismissed]);

  if (dismissed) return null;

  const item = FL_RECENT_PURCHASES[index];
  const thumb = THUMBS[index % THUMBS.length];

  return (
    <aside className={`fl-recent${open ? " is-open" : ""}`} aria-live="polite">
      <button
        type="button"
        className="fl-recent__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fl-recent__img" src={thumb} alt="" aria-hidden="true" loading="lazy" />
      <div className="fl-recent__text">
        <b>{item.name}</b> in {item.country} purchased <b>{item.product}</b>
        <span className="fl-recent__time">{item.time}</span>
      </div>
    </aside>
  );
}
