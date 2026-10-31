/**
 * Listing helpers shared by category, search and special pages.
 *
 * Everything here is pure so the URL contract (page/sort/limit) can be unit
 * tested without rendering: the reference exposes Sort By with nine options and
 * Show with 25/48/50/75/100, and keeps both in the query string.
 */
import type { FlProduct } from "./florencess-catalog";
import { flNumericPrice } from "./florencess-catalog";

export type FlSortValue =
  | "default"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "rating-desc"
  | "rating-asc"
  | "model-asc"
  | "model-desc";

export const FL_SORT_OPTIONS: { value: FlSortValue; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "name-asc", label: "Name (A - Z)" },
  { value: "name-desc", label: "Name (Z - A)" },
  { value: "price-asc", label: "Price (Low > High)" },
  { value: "price-desc", label: "Price (High > Low)" },
  { value: "rating-desc", label: "Rating (Highest)" },
  { value: "rating-asc", label: "Rating (Lowest)" },
  { value: "model-asc", label: "Model (A - Z)" },
  { value: "model-desc", label: "Model (Z - A)" },
];

export const FL_PAGE_SIZES = [25, 48, 50, 75, 100] as const;
export const FL_DEFAULT_PAGE_SIZE = 48;

export type FlListParams = {
  page: number;
  sort: FlSortValue;
  limit: number;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Normalise untrusted search params; invalid values fall back to defaults. */
export function parseFlListParams(
  searchParams: Record<string, string | string[] | undefined>,
): FlListParams {
  const sortRaw = first(searchParams.sort);
  const sort = FL_SORT_OPTIONS.some((option) => option.value === sortRaw)
    ? (sortRaw as FlSortValue)
    : "default";

  const limitRaw = Number(first(searchParams.limit));
  const limit = (FL_PAGE_SIZES as readonly number[]).includes(limitRaw)
    ? limitRaw
    : FL_DEFAULT_PAGE_SIZE;

  const pageRaw = Number(first(searchParams.page));
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  return { page, sort, limit };
}

/**
 * Rating is not published by the reference pages (every card renders five empty
 * stars), so both rating sorts keep the capture order. That is a documented
 * stable fallback rather than invented rating data.
 */
export function sortFlProducts(products: FlProduct[], sort: FlSortValue): FlProduct[] {
  const list = [...products];
  const byName = (a: FlProduct, b: FlProduct) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  const byModel = (a: FlProduct, b: FlProduct) =>
    (a.model || "").localeCompare(b.model || "", "en", { sensitivity: "base" });
  // Products without a published price stay last in BOTH directions: missing
  // data is never treated as "cheapest" or "most expensive".
  const byPrice = (a: FlProduct, b: FlProduct, direction: 1 | -1 = 1) => {
    const left = flNumericPrice(a);
    const right = flNumericPrice(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return (left - right) * direction;
  };

  switch (sort) {
    case "name-asc":
      return list.sort(byName);
    case "name-desc":
      return list.sort((a, b) => byName(b, a));
    case "price-asc":
      return list.sort(byPrice);
    case "price-desc":
      return list.sort((a, b) => byPrice(a, b, -1));
    case "model-asc":
      return list.sort(byModel);
    case "model-desc":
      return list.sort((a, b) => byModel(b, a));
    case "rating-asc":
    case "rating-desc":
    case "default":
    default:
      return list;
  }
}

export type FlPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
};

/**
 * Slice one page. Out-of-range pages clamp to the last page (and page 0 or a
 * negative page clamps to the first), matching the normalisation the plan
 * requires for illegal page parameters.
 */
export function paginateFl<T>(items: T[], page: number, limit: number): FlPage<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (safePage - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    items: slice,
    page: safePage,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + slice.length,
  };
}

/** Build a listing href that preserves active params and drops defaults. */
export function flListHref(
  basePath: string,
  params: Partial<FlListParams> & Record<string, string | number | undefined>,
  patch: Record<string, string | number | undefined> = {},
): string {
  const merged: Record<string, string | number | undefined> = { ...params, ...patch };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && Number(value) === 1) continue;
    if (key === "sort" && value === "default") continue;
    if (key === "limit" && Number(value) === FL_DEFAULT_PAGE_SIZE) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
