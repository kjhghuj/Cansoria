import { Metadata } from "next";
import { Suspense } from "react";
import { getProducts, getRegion } from "@/lib/medusa";
import { StoreProduct } from "@/lib/types";
import ShopFilters from "./components/ShopFilters";
import { ShopHeader } from "./components/ShopHeader";
import { ProductGrid } from "./components/ProductGrid";

export const revalidate = 60;

interface ShopPageProps {
  searchParams: Promise<{ category?: string; sort?: string }>;
}

export const SHOP_CATEGORIES = [
  {
    label: "Custom Portraits",
    value: "custom-portraits",
    aliases: ["custom-portraits", "custom-painting", "portrait", "photo-to-painting"],
  },
  {
    label: "Pet Portraits",
    value: "pet-portraits",
    aliases: ["pet-portraits", "pet-painting", "pet", "dog", "cat"],
  },
  {
    label: "Wedding Gifts",
    value: "wedding-gifts",
    aliases: ["wedding-gifts", "wedding-anniversary", "anniversary", "couple"],
  },
  {
    label: "Landscape",
    value: "landscape",
    aliases: ["landscape", "landscape-paintings", "seascape", "scenery"],
  },
  {
    label: "Abstract",
    value: "abstract",
    aliases: ["abstract", "abstract-wall-art", "modern-abstract"],
  },
  {
    label: "Classic Art",
    value: "classic-art",
    aliases: ["classic-art", "classic-reproductions", "reproduction", "old-master"],
  },
  {
    label: "Home Decor",
    value: "home-decor",
    aliases: ["home-decor", "canvas-wall-art", "wall-art", "living-room"],
  },
] as const;

type ShopCategory = (typeof SHOP_CATEGORIES)[number];

async function getShopData() {
  const region = await getRegion("gb");
  const { products } = await getProducts(region?.id, 50);

  return { products, region };
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";

  const title = "Shop Custom Oil Paintings | Cansoria";
  const description =
    "Browse hand-painted oil paintings, custom portraits, pet portraits, wedding gifts, and canvas wall art by Cansoria.";

  let canonical = `${baseUrl}/shop`;
  if (category) {
    canonical += `?category=${category}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
    },
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSelectedCategory(category?: string) {
  if (!category) return undefined;
  const normalizedCategory = normalize(category);

  return SHOP_CATEGORIES.find(
    (item) =>
      item.value === normalizedCategory ||
      item.aliases.some((alias) => alias === normalizedCategory)
  );
}

function getProductText(product: StoreProduct) {
  const categories =
    product.categories?.flatMap((category) => [category.name, category.handle]) ?? [];
  const tags = product.tags?.map((tag) => tag.value) ?? [];
  const collection = product.collection
    ? [product.collection.title, product.collection.handle]
    : [];

  return [
    product.title,
    product.subtitle,
    product.description,
    product.handle,
    ...categories,
    ...tags,
    ...collection,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalize)
    .join(" ");
}

function productMatchesCategory(product: StoreProduct, category: ShopCategory) {
  const productText = getProductText(product);
  return category.aliases.some((alias) => productText.includes(alias));
}

function getLowestPrice(product: StoreProduct) {
  const prices =
    product.variants
      ?.map((variant) => variant.calculated_price?.calculated_amount)
      .filter((amount): amount is number => typeof amount === "number") ?? [];

  return prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const { category, sort } = await searchParams;
  const { products, region } = await getShopData();
  const selectedCategory = getSelectedCategory(category);

  let filteredProducts = products;
  if (selectedCategory) {
    filteredProducts = products.filter((product) =>
      productMatchesCategory(product, selectedCategory)
    );
  }

  if (sort === "price-asc") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) => getLowestPrice(a) - getLowestPrice(b)
    );
  } else if (sort === "price-desc") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) => getLowestPrice(b) - getLowestPrice(a)
    );
  } else if (sort === "newest") {
    filteredProducts = [...filteredProducts].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  }

  return (
    <div className="pt-24 pb-16">
      <ShopHeader />

      <Suspense fallback={<div className="h-12" />}>
        <ShopFilters
          categories={SHOP_CATEGORIES.map(({ label, value }) => ({ label, value }))}
          currentCategory={selectedCategory?.value}
          currentSort={sort}
          productCount={filteredProducts.length}
        />
      </Suspense>

      <ProductGrid
        products={filteredProducts}
        region={region}
        category={selectedCategory?.label}
      />
    </div>
  );
}
