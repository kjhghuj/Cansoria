import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import { getProductByHandle, getRegion } from "@/lib/medusa";
import ProductClient from "./components/ProductClient";
import { studioProduct, studioProductSeo } from "@/lib/studio-content";
import { getPortraitStyle } from "@/lib/portrait";
import { Breadcrumb } from "./components/Breadcrumb";
import ProductStory, { StorySection } from "./components/ProductStory";

// Each HTML response needs the request's CSP nonce, including new product handles.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ style?: string }>;
}

function parseStorySections(
  metadata: Record<string, unknown> | null | undefined,
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

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const region = await getRegion("gb");
  const rawProduct = await getProductByHandle(handle, region?.id);
  const product = rawProduct ? studioProduct(rawProduct) : null;

  if (!product) {
    return {
      title: "Product Not Found | Cansoria",
      description: "The product you are looking for could not be found.",
    };
  }

  return studioProductSeo(product);
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { handle } = await params;
  const initialStyle = getPortraitStyle((await searchParams).style);
  const region = await getRegion("gb");
  const rawProduct = await getProductByHandle(handle, region?.id);
  const product = rawProduct ? studioProduct(rawProduct) : null;

  if (!product) {
    notFound();
  }

  const images =
    product.handle === "pet-portrait-oil-painting"
      ? [
          { url: "/images/pet-oil/" + initialStyle + ".webp" },
          { url: "/images/pet-oil/hero-room.png" },
        ]
      : product.images || [];
  const thumbnail = product.thumbnail;
  const category = product.categories?.[0] || null;
  const currencyCode = region?.currency_code?.toUpperCase() || "GBP";
  const storySections = parseStorySections(product.metadata);

  return (
    <>
      <div className="studio-page studio-product min-h-screen bg-cream pb-16 pt-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Breadcrumb product={product} />
          <ProductClient
            key={`${product.id}:${initialStyle}`}
            initialStyle={initialStyle}
            product={product}
            images={images}
            thumbnail={thumbnail}
            category={category}
            currencyCode={currencyCode}
          />
        </div>
      </div>

      <ProductStory sections={storySections} />

      {/* Browsers redact nonce attributes; this static JSON-LD script keeps its CSP nonce. */}
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        suppressHydrationWarning
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
          }),
        }}
      />
    </>
  );
}
