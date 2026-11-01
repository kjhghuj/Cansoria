"use client";

import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 600;

/**
 * Back-to-top control shown after the viewport scrolls past the first screen.
 * The scroll listener is rAF-throttled and removed on unmount; reduced-motion
 * visitors get an instant jump instead of a smooth scroll (probed at click
 * time, so the server markup never depends on a media query).
 */
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    requestAnimationFrame(update);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      className={`fl-scrolltop${visible ? " is-visible" : ""}`}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        const reduceMotion = window
          .matchMedia("(prefers-reduced-motion: reduce)")
          .matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
    >
      ↑
    </button>
  );
}
