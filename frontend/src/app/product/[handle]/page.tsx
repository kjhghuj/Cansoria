import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import { getProductByHandle, getRegion } from "@/lib/medusa";
import { StoreProduct } from "@/lib/types";
import ProductClient from "./components/ProductClient";
import { Breadcrumb } from "./components/Breadcrumb";
import ProductStory, { StorySection } from "./components/ProductStory";

// Each HTML response needs the request's CSP nonce, including new product handles.
export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ handle: string }>;
}

function parseStorySections(
  metadata: Record<string, unknown> | null | undefined
): StorySection[] {
  if (!metadata?.story_sections) {
    return [];
  }

  try {
    const sections = Array.isArray(metadata.story_sections)
      ? metadata.story_sections
      : JSON.parse(String(metadata.story_sections));

    if (!Array.isArray(sections)) {
      return [];
    }

    return sections.filter((section: unknown): section is StorySection => {
      if (typeof section !== "object" || section === null) return false;
      const value = section as Record<string, unknown>;
      return typeof value.id === "string" && typeof value.title === "string";
    });
  } catch (error) {
    console.error("[ProductPage] Failed to parse story_sections:", error);
    return [];
  }
}

function getVariantPrices(product: StoreProduct) {
  return (
    product.variants
      ?.map((variant) => variant.calculated_price?.calculated_amount)
      .filter((amount): amount is number => typeof amount === "number") ?? []
  );
}

function getLowestPrice(product: StoreProduct) {
  const prices = getVariantPrices(product);
  return prices.length > 0 ? Math.min(...prices) : undefined;
}

function hasAvailableVariant(product: StoreProduct) {
  return (
    product.variants?.some((variant) => {
      if (!variant.id) return false;
      if (!variant.manage_inventory || variant.allow_backorder) return true;
      return (variant.inventory_quantity ?? 0) > 0;
    }) ?? false
  );
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const region = await getRegion("gb");
  const product = await getProductByHandle(handle, region?.id);

  if (!product) {
    return {
      title: "Product Not Found | Cansoria",
      description: "The product you are looking for could not be found.",
    };
  }

  const image = product.thumbnail || product.images?.[0]?.url;
  const description =
    product.description ||
    `Shop ${product.title} at Cansoria, featuring custom hand-painted oil paintings and premium canvas wall art.`;

  return {
    title: `${product.title} | Cansoria`,
    description,
    openGraph: {
      title: product.title || "Cansoria Oil Painting",
      description,
      images: image ? [{ url: image }] : [],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const region = await getRegion("gb");
  const product = await getProductByHandle(handle, region?.id);

  if (!product) {
    notFound();
  }

  const images = product.images || [];
  const thumbnail = product.thumbnail;
  const category = product.categories?.[0] || null;
  const currencyCode = region?.currency_code?.toUpperCase() || "GBP";
  const lowestPrice = getLowestPrice(product);
  const storySections = parseStorySections(product.metadata);
  const availability = hasAvailableVariant(product)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  return (
    <>
      <main className="min-h-screen bg-cream pb-16 pt-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Breadcrumb product={product} category={category} />
          <ProductClient
            product={product}
            images={images}
            thumbnail={thumbnail}
            category={category}
            currencyCode={currencyCode}
          />
        </div>
      </main>

      <ProductStory sections={storySections} />

      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: images.map((image) => image.url).filter(Boolean),
            sku: product.variants?.[0]?.sku || product.handle,
            brand: {
              "@type": "Brand",
              name: "Cansoria",
            },
            offers: {
              "@type": "Offer",
              url: `${
                process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com"
              }/product/${product.handle}`,
              priceCurrency: currencyCode,
              price: lowestPrice !== undefined ? lowestPrice / 100 : undefined,
              availability,
            },
          }),
        }}
      />
    </>
  );
}
