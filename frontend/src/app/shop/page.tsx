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

const SHOP_CATEGORIES = [
  {
    label: "Dog Portraits",
    value: "dog-portraits",
    aliases: ["dog-portraits", "dog-portrait", "dogs", "dog", "puppy", "puppies"],
  },
  {
    label: "Cat Masterpieces",
    value: "cat-masterpieces",
    aliases: ["cat-masterpieces", "cat-portraits", "cat-portrait", "cats", "cat", "kitten", "feline"],
  },
  {
    label: "Multiple Pets & Family",
    value: "multiple-pets",
    aliases: ["multiple-pets", "multi-pet", "family-portrait", "multi-pet-family"],
  },
  {
    label: "Memorial & Rainbow Bridge",
    value: "memorial",
    aliases: ["memorial", "memorial-keepsakes", "pet-memorial", "rainbow-bridge"],
  },
] as const;

// Params that mean "the whole bespoke pet collection" (no filtering).
const ALL_PETS_ALIASES = new Set([
  "pet-portraits",
  "pet-portrait",
  "pet-painting",
  "pets",
  "pet",
  "all-pet-portraits",
  "custom-painting",
  "custom-portraits",
  "custom",
]);

type ShopCategory = (typeof SHOP_CATEGORIES)[number];

async function getShopData() {
  const region = await getRegion("gb");
  const { products } = await getProducts(region?.id, 50);

  return { products, region };
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";

  const title = "The Bespoke Pet Art Collection | Cansoria";
  const description =
    "Commission museum-grade, 100% hand-painted oil portraits of your dogs, cats, and cherished companions. Free digital proof with unlimited revisions before shipping.";

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

  if (ALL_PETS_ALIASES.has(normalizedCategory)) return undefined;

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
