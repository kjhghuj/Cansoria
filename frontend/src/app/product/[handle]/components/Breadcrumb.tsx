import Link from "next/link";
import { StoreProduct, StoreProductCategory } from "@/lib/types";

interface BreadcrumbProps {
  product: StoreProduct;
  category?: StoreProductCategory | null;
}

export function Breadcrumb({ product, category }: BreadcrumbProps) {
  const categoryHref = category?.handle
    ? `/shop?category=${category.handle}`
    : "/shop";

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
          <Link href="/shop" className="transition-colors hover:text-charcoal">
            Shop
          </Link>
        </li>
        {category?.name && (
          <>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={categoryHref}
                className="transition-colors hover:text-charcoal"
              >
                {category.name}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true">/</li>
        <li className="max-w-[220px] truncate text-charcoal">
          {product.title}
        </li>
      </ol>
    </nav>
  );
}
