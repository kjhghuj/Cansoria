"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FlNavGroup } from "@/lib/florencess-data";

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 200;

/**
 * Desktop mega-menu group: a top-level link plus a container-wide panel with
 * link columns and a promo tile. Opening is hover-intent based (short delay
 * in, slightly longer out) so skimming the bar does not flicker panels;
 * keyboard focus inside the group opens it immediately, and Escape closes it
 * and returns focus to the top-level link. The top-level link stays a plain
 * link so the category page is always one click away.
 */
export default function MegaMenu({ group }: { group: FlNavGroup }) {
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // After Escape the panel stays closed while focus sits inside the group;
  // leaving the group re-arms focus opening.
  const dismissed = useRef(false);
  const rootRef = useRef<HTMLLIElement | null>(null);
  const topLinkRef = useRef<HTMLAnchorElement | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const show = useCallback(() => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [clearTimers]);

  const onFocusIn = useCallback(() => {
    if (!dismissed.current) {
      clearTimers();
      setOpen(true);
    }
  }, [clearTimers]);

  const onFocusOut = useCallback(
    (event: React.FocusEvent<HTMLLIElement>) => {
      if (rootRef.current?.contains(event.relatedTarget as Node)) return;
      dismissed.current = false;
      setOpen(false);
    },
    [],
  );

  const onEscape = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    dismissed.current = true;
    setOpen(false);
    topLinkRef.current?.focus();
  }, []);

  return (
    <li
      ref={rootRef}
      className={`fl-nav__item fl-nav__item--mega${open ? " is-open" : ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
      onKeyDown={onEscape}
    >
      <Link ref={topLinkRef} className="fl-nav__link" href={group.href}>
        {group.label}
      </Link>
      <div className="fl-mega__panel" aria-hidden={!open}>
        <div className="fl-mega__columns">
          {(group.columns ?? []).map((column) => (
            <div className="fl-mega__column" key={column.title}>
              <span className="fl-mega__column-title">{column.title}</span>
              {column.links.map((link) => (
                <Link key={`${link.href}#${link.label}`} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        {group.promo ? (
          <Link className="fl-mega__promo" href={group.promo.href} tabIndex={open ? 0 : -1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={group.promo.image} alt={group.promo.alt} loading="lazy" width={300} height={360} />
            <span className="fl-mega__promo-title">{group.promo.title}</span>
          </Link>
        ) : null}
      </div>
    </li>
  );
}
