import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import BrandView from "@/components/florencess/BrandView";
import CatalogUnavailable from "@/components/florencess/CatalogUnavailable";
import CategoryView from "@/components/florencess/CategoryView";
import ProductView from "@/components/florencess/ProductView";
import { StaticPage } from "@/components/florencess";
import { FL_ARTICLES } from "@/lib/florencess-content";
import { type FlCategory, type FlProduct, flCategoryProducts } from "@/lib/florencess-catalog";
import { flListHref, paginateFl, parseFlListParams, sortFlProducts } from "@/lib/florencess-listing";
import { resolveFlSlug } from "@/lib/florencess-routes";
import {
  getMedusaCategoryBySlug,
  getMedusaProductBySlug,
  listMedusaCategoryProducts,
  mapMedusaProduct,
  resolveStorefrontSlug,
} from "@/lib/medusa-catalog";
import { MedusaUnavailableError, getRegion } from "@/lib/medusa";
import type { StoreRegion } from "@/lib/types";
import { SITE_NAME, pageTitle } from "@/lib/brand";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = resolveFlSlug(slug);

  if (route?.kind === "category") {
    return {
      title: pageTitle(`${route.category.title}`),
      description: `Shop ${route.category.title.toLowerCase()} at ${SITE_NAME}.`,
      alternates: { canonical: `/${route.category.slug}` },
    };
  }

  if (route?.kind === "product") {
    const { product } = route;
    return {
      title: pageTitle(`${product.title}`),
      description: product.description.slice(0, 180) || `${product.title} at ${SITE_NAME}.`,
      alternates: { canonical: `/${product.slug}` },
      openGraph: {
        title: product.title,
        images: product.localImages[0]?.src ? [product.localImages[0].src] : undefined,
      },
    };
  }

  if (route?.kind === "article") {
    const article = FL_ARTICLES[route.slug];
    return {
      title: pageTitle(`${article.label}`),
      alternates: { canonical: `/${route.slug}` },
    };
  }

  if (route?.kind === "brand") {
    return {
      title: pageTitle(`${route.brand.label}`),
      alternates: { canonical: `/${route.brand.slug}` },
    };
  }

  // Local catalogue miss: same resolution order as the page body. A backend
  // outage yields empty metadata (the body renders the unavailable state).
  try {
    const region = await getRegion();
    const detail = await getMedusaProductBySlug(slug, region?.id);
    if (detail) {
      return {
        title: pageTitle(detail.product.title),
        description:
          detail.product.description.slice(0, 180) ||
          `${detail.product.title} at ${SITE_NAME}.`,
        alternates: { canonical: `/${detail.product.slug}` },
        openGraph: {
          title: detail.product.title,
          images: detail.product.localImages[0]?.src
            ? [detail.product.localImages[0].src]
            : undefined,
        },
      };
    }
    const category = await getMedusaCategoryBySlug(slug);
    if (category) {
      return {
        title: pageTitle(category.name),
        description: `Shop ${category.name.toLowerCase()} at ${SITE_NAME}.`,
        alternates: { canonical: `/${category.handle}` },
      };
    }
  } catch (error) {
    if (!(error instanceof MedusaUnavailableError)) throw error;
  }

  return {};
}

/**
 * Local category listing merged with a same-handle Medusa category. Medusa
 * products come first; a Medusa failure degrades to the local list plus a
 * notice instead of hiding the page.
 */
async function mergedCategoryProducts(
  category: FlCategory,
  region: StoreRegion | null,
): Promise<{ products: FlProduct[]; degraded: boolean }> {
  const localProducts = flCategoryProducts(category);
  try {
    const medusaCategory = await getMedusaCategoryBySlug(category.slug);
    if (!medusaCategory) return { products: localProducts, degraded: false };
    const raw = await listMedusaCategoryProducts(medusaCategory.id, region?.id);
    const currency = region?.currency_code ?? "usd";
    return {
      products: [...raw.map((product) => mapMedusaProduct(product, currency)), ...localProducts],
      degraded: false,
    };
  } catch (error) {
    if (!(error instanceof MedusaUnavailableError)) throw error;
    console.error("[medusa-catalog] degraded category listing", { slug: category.slug });
    return { products: localProducts, degraded: true };
  }
}

export default async function DynamicFlPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const local = resolveFlSlug(slug);
  const region = await getRegion();

  if (local?.kind === "category") {
    const resolved = await searchParams;
    const { products, degraded } = await mergedCategoryProducts(local.category, region);
    const listParams = parseFlListParams(resolved);
    const page = paginateFl(sortFlProducts(products, listParams.sort), listParams.page, listParams.limit);
    if (page.page !== listParams.page) {
      redirect(flListHref(`/${local.category.slug}`, { ...listParams, page: page.page }));
    }
    return (
      <CategoryView
        category={local.category}
        products={products}
        searchParams={resolved}
        degraded={degraded}
      />
    );
  }

  if (local?.kind === "product") {
    return <ProductView product={local.product} category={local.category} />;
  }

  if (local?.kind === "article") {
    return <StaticPage page={FL_ARTICLES[local.slug]} />;
  }

  if (local?.kind === "brand") {
    return <BrandView brand={local.brand} />;
  }

  try {
    const resolved = await resolveStorefrontSlug(slug, region?.id);

    if (resolved?.kind === "medusa-product") {
      return (
        <ProductView product={resolved.product} variants={resolved.variants} />
      );
    }

    if (resolved?.kind === "medusa-category") {
      const raw = await listMedusaCategoryProducts(resolved.category.id, region?.id);
      const currency = region?.currency_code ?? "usd";
      const products = raw.map((product) => mapMedusaProduct(product, currency));
      const search = await searchParams;
      const listParams = parseFlListParams(search);
      const page = paginateFl(
        sortFlProducts(products, listParams.sort),
        listParams.page,
        listParams.limit,
      );
      if (page.page !== listParams.page) {
        redirect(
          flListHref(`/${resolved.category.handle}`, { ...listParams, page: page.page }),
        );
      }
      return (
        <CategoryView
          category={{ slug: resolved.category.handle, title: resolved.category.name }}
          products={products}
          searchParams={search}
        />
      );
    }
  } catch (error) {
    if (!(error instanceof MedusaUnavailableError)) throw error;
    return <CatalogUnavailable slug={slug} />;
  }

  notFound();
}
