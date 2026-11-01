/**
 * Wishlist domain rules. Everything here is pure and validated: entries come
 * from localStorage or customer metadata, i.e. untrusted storage that may be
 * stale, truncated or hostile. Malformed entries are dropped silently — a
 * broken saved list must never break the page.
 */
export const WISHLIST_KEY = "lorencess_wishlist";
export const WISHLIST_LIMIT = 100;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/;
const TITLE_MAX = 300;
const PRICE_MAX = 40;
const IMAGE_MAX = 1000;

export type WishlistItem = {
  /** Product URL slug — the stable identity of a wish. */
  slug: string;
  title: string;
  /** Same-origin path, https URL, loopback http URL, or "" when imageless. */
  image: string;
  /** Display price captured at add time, shown as a snapshot only; may be "". */
  price: string;
  /** ISO 8601 timestamp. */
  addedAt: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Image policy, enforced by parsing rather than prefix-matching:
 * same-origin paths (/…, never protocol-relative //…), https URLs, and http
 * URLs on loopback hosts only (local dev serves Medusa images from
 * http://localhost:9030). javascript:, data:, remote http and unparsable
 * values are rejected. "" means "no image" and is allowed.
 */
function validImage(value: unknown): value is string {
  if (!boundedString(value, IMAGE_MAX)) return false;
  if (value === "") return true;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:") return LOOPBACK_HOSTS.has(url.hostname);
    return false;
  } catch {
    return false;
  }
}

function validAddedAt(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

/** Validate one raw entry; returns null for anything untrustworthy. */
function parseItem(raw: unknown): WishlistItem | null {
  if (!isPlainObject(raw)) return null;
  const { slug, title, image, price, addedAt } = raw;
  if (!finiteString(slug, 200) || !SLUG_PATTERN.test(slug)) return null;
  if (!finiteString(title, TITLE_MAX)) return null;
  if (!validImage(image)) return null;
  if (!boundedString(price, PRICE_MAX)) return null;
  if (!validAddedAt(addedAt)) return null;
  return { slug, title, image, price, addedAt };
}

/** Parse saved wishlist data (localStorage payload or customer metadata). */
export function parseWishlist(raw: unknown): WishlistItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: WishlistItem[] = [];
  for (const entry of raw.slice(0, WISHLIST_LIMIT * 2)) {
    const item = parseItem(entry);
    if (!item || seen.has(item.slug)) continue;
    seen.add(item.slug);
    items.push(item);
    if (items.length >= WISHLIST_LIMIT) break;
  }
  return items;
}

function cap(list: WishlistItem[]): WishlistItem[] {
  return list.length > WISHLIST_LIMIT ? list.slice(0, WISHLIST_LIMIT) : list;
}

/** Add (or refresh) an item at the front; inputs are never mutated. */
export function addItem(list: WishlistItem[], item: WishlistItem): WishlistItem[] {
  const clean = parseItem(item);
  if (!clean) return list;
  return cap([clean, ...list.filter((entry) => entry.slug !== clean.slug)]);
}

export function removeItem(list: WishlistItem[], slug: string): WishlistItem[] {
  return list.filter((entry) => entry.slug !== slug);
}

export function hasItem(list: WishlistItem[], slug: string): boolean {
  return list.some((entry) => entry.slug === slug);
}

/**
 * Merge a guest list into an account list: fresher (guest) entries win on
 * slug conflicts, guest order first, capped at the limit.
 */
export function mergeLists(guest: WishlistItem[], account: WishlistItem[]): WishlistItem[] {
  const seen = new Set<string>();
  const merged: WishlistItem[] = [];
  for (const item of [...guest, ...account]) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    merged.push(item);
    if (merged.length >= WISHLIST_LIMIT) break;
  }
  return merged;
}
