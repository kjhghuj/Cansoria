import Link from "next/link";
import { StoreProduct } from "@/lib/types";
import { collectionsUrl } from "@/lib/studio-content";

interface BreadcrumbProps {
  product: StoreProduct;
}

export function Breadcrumb({ product }: BreadcrumbProps) {
  return (
    <nav className="mb-8 text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-charcoal-light">
        <li>
          <Link href="/" className="transition-colors hover:text-charcoal">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <a href={collectionsUrl} className="transition-colors hover:text-charcoal">
            Watches
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li className="max-w-[220px] truncate text-charcoal" aria-current="page">
          {product.title}
        </li>
      </ol>
    </nav>
  );
}
