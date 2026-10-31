"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  FL_PAGE_SIZES,
  FL_SORT_OPTIONS,
  type FlListParams,
  flListHref,
} from "@/lib/florencess-listing";

type Props = {
  basePath: string;
  params: FlListParams;
  /** Extra query values the listing must preserve (search terms, category). */
  preserved?: Record<string, string | undefined>;
};

/**
 * Sort / Show control pair. The reference submits a GET form; this keeps the
 * same form as a no-JS fallback and additionally updates the URL in place when
 * JavaScript is available, so the listing does not lose scroll position.
 */
export default function ListingToolbar({ basePath, params, preserved = {} }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const go = (patch: Record<string, string | number>) => {
    const href = flListHref(basePath, { ...preserved, sort: params.sort, limit: params.limit }, patch);
    startTransition(() => router.push(href, { scroll: false }));
  };

  return (
    <form
      className="fl-listing__toolbar"
      action={basePath}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const href = flListHref(basePath, Object.fromEntries(data.entries()) as never);
        startTransition(() => router.push(href, { scroll: false }));
      }}
      data-pending={pending ? "true" : undefined}
    >
      {Object.entries(preserved).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}

      <div className="fl-listing__field">
        <label htmlFor="fl-sort">Sort By</label>
        <select
          id="fl-sort"
          name="sort"
          key={`sort-${params.sort}`}
          defaultValue={params.sort}
          onChange={(event) => go({ sort: event.currentTarget.value, page: 1 })}
        >
          {FL_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="fl-listing__field">
        <label htmlFor="fl-show">Show</label>
        <select
          id="fl-show"
          name="limit"
          key={`limit-${params.limit}`}
          defaultValue={String(params.limit)}
          onChange={(event) => go({ limit: event.currentTarget.value, page: 1 })}
        >
          {FL_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <button className="fl-listing__submit" type="submit">
        Apply
      </button>
    </form>
  );
}
