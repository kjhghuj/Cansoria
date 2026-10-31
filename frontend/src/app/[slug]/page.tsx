import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BrandView from "@/components/florencess/BrandView";
import CategoryView from "@/components/florencess/CategoryView";
import ProductView from "@/components/florencess/ProductView";
import { StaticPage } from "@/components/florencess";
import { FL_ARTICLES } from "@/lib/florencess-content";
import { flCategoryProducts } from "@/lib/florencess-catalog";
import { flListHref, paginateFl, parseFlListParams } from "@/lib/florencess-listing";
import { resolveFlSlug } from "@/lib/florencess-routes";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = resolveFlSlug(slug);
  if (!route) return {};

  if (route.kind === "category") {
    return {
      title: `${route.category.title} | FLORENCESS`,
      description: `Shop ${route.category.title.toLowerCase()} at FLORENCESS.`,
      alternates: { canonical: `/${route.category.slug}` },
    };
  }

  if (route.kind === "product") {
    const { product } = route;
    return {
      title: `${product.title} | FLORENCESS`,
      description: product.description.slice(0, 180) || `${product.title} at FLORENCESS.`,
      alternates: { canonical: `/${product.slug}` },
      openGraph: {
        title: product.title,
        images: product.localImages[0]?.src ? [product.localImages[0].src] : undefined,
      },
    };
  }

  if (route.kind === "article") {
    const article = FL_ARTICLES[route.slug];
    return {
      title: `${article.label} | FLORENCESS`,
      alternates: { canonical: `/${route.slug}` },
    };
  }

  return {
    title: `${route.brand.label} | FLORENCESS`,
    alternates: { canonical: `/${route.brand.slug}` },
  };
}

export default async function DynamicFlPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const route = resolveFlSlug(slug);
  if (!route) notFound();

  if (route.kind === "category") {
    const resolved = await searchParams;
    const products = flCategoryProducts(route.category);
    const params = parseFlListParams(resolved);
    const page = paginateFl(products, params.page, params.limit);
    if (page.page !== params.page) {
      redirect(flListHref(`/${route.category.slug}`, { ...params, page: page.page }));
    }
    return (
      <CategoryView
        category={route.category}
        products={products}
        searchParams={resolved}
      />
    );
  }

  if (route.kind === "product") {
    return <ProductView product={route.product} category={route.category} />;
  }

  if (route.kind === "article") {
    return <StaticPage page={FL_ARTICLES[route.slug]} />;
  }

  return <BrandView brand={route.brand} />;
}
