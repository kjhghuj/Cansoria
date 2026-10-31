import Link from "next/link";
import { type FlListParams, flListHref } from "@/lib/florencess-listing";

type Props = {
  basePath: string;
  page: number;
  pageCount: number;
  params: FlListParams;
  preserved?: Record<string, string | undefined>;
};

/** Page numbers to render: always both ends, a window around the current page. */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => pages.add(value));
  if (page >= pageCount - 2) [pageCount - 1, pageCount - 2, pageCount - 3].forEach((value) => pages.add(value));
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const output: (number | "gap")[] = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - (sorted[index - 1] as number) > 1) output.push("gap");
    output.push(value);
  });
  return output;
}

export default function Pagination({ basePath, page, pageCount, params, preserved = {} }: Props) {
  if (pageCount <= 1) return null;
  const href = (target: number) =>
    flListHref(basePath, { ...preserved, sort: params.sort, limit: params.limit }, { page: target });

  return (
    <nav aria-label="Pagination">
      <ul className="fl-pagination">
        <li>
          <Link
            className={`fl-pagination__item${page === 1 ? " fl-pagination__item--disabled" : ""}`}
            href={href(1)}
            aria-label="First page"
            aria-disabled={page === 1}
          >
            &laquo;
          </Link>
        </li>
        <li>
          <Link
            className={`fl-pagination__item${page === 1 ? " fl-pagination__item--disabled" : ""}`}
            href={href(Math.max(1, page - 1))}
            aria-label="Previous page"
            aria-disabled={page === 1}
          >
            &lsaquo;
          </Link>
        </li>
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} className="fl-pagination__item fl-pagination__item--disabled" aria-hidden="true">
              &hellip;
            </li>
          ) : (
            <li key={entry}>
              <Link
                className="fl-pagination__item"
                href={href(entry)}
                aria-current={entry === page ? "page" : undefined}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
        <li>
          <Link
            className={`fl-pagination__item${page === pageCount ? " fl-pagination__item--disabled" : ""}`}
            href={href(Math.min(pageCount, page + 1))}
            aria-label="Next page"
            aria-disabled={page === pageCount}
          >
            &rsaquo;
          </Link>
        </li>
        <li>
          <Link
            className={`fl-pagination__item${page === pageCount ? " fl-pagination__item--disabled" : ""}`}
            href={href(pageCount)}
            aria-label="Last page"
            aria-disabled={page === pageCount}
          >
            &raquo;
          </Link>
        </li>
      </ul>
    </nav>
  );
}
