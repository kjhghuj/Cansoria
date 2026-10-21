import { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import { getProductByHandle, getRegion, getStoreOrdersOpen } from "@/lib/medusa";
import { DEFAULT_CURRENCY_CODE } from "@/lib/market";
import ProductClient from "./components/ProductClient";
import { studioProduct, studioProductSeo, collectionsUrl } from "@/lib/studio-content";
import { Breadcrumb } from "./components/Breadcrumb";
import ProductStory, { StorySection } from "./components/ProductStory";

// Each HTML response needs the request's CSP nonce, including new product handles.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ handle: string }>;
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
  const [region, ordersOpen] = await Promise.all([getRegion(), getStoreOrdersOpen()]);
  const rawProduct = await getProductByHandle(handle, region?.id);
  const product = rawProduct ? studioProduct(rawProduct, { ordersOpen }) : null;

  if (!product) {
    return {
      title: "Product Not Found | Cansoria",
      description: "The product you are looking for could not be found.",
    };
  }

  return studioProductSeo(product, { ordersOpen });
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { handle } = await params;
  const [region, ordersOpen] = await Promise.all([getRegion(), getStoreOrdersOpen()]);
  const rawProduct = await getProductByHandle(handle, region?.id);
  const product = rawProduct ? studioProduct(rawProduct, { ordersOpen }) : null;

  if (!product) {
    notFound();
  }

  const images = product.images || [];
  const thumbnail = product.thumbnail;
  const category = product.categories?.[0] || null;
  const currencyCode = region?.currency_code?.toUpperCase() || DEFAULT_CURRENCY_CODE;
  const storySections = parseStorySections(product.metadata);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";

  return (
    <>
      <div className="studio-page studio-product min-h-screen bg-cream pb-16 pt-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Breadcrumb product={product} />
          <ProductClient
            key={product.id}
            product={product}
            images={images}
            thumbnail={thumbnail}
            category={category}
            currencyCode={currencyCode}
            ordersOpen={ordersOpen}
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
      {/* Mirrors the visible breadcrumb trail (Home / Watches / product). */}
      <script
        type="application/ld+json"
        nonce={(await headers()).get("x-nonce") ?? undefined}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: `${baseUrl}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Watches",
                item: `${baseUrl}${collectionsUrl}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: product.title,
                item: `${baseUrl}/product/${product.handle}`,
              },
            ],
          }),
        }}
      />
    </>
  );
}
