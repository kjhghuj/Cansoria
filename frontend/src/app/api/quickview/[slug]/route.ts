import { NextResponse } from "next/server";
import { getFlProduct, type FlProduct } from "@/lib/florencess-catalog";
import { flProductHasVariants, getFlVariantMapping } from "@/lib/florencess-variants";
import type { FlVariant } from "@/lib/florencess-variants";
import { MedusaUnavailableError } from "@/lib/medusa";
import { getMedusaProductBySlug } from "@/lib/medusa-catalog";
import { getRequestRegion } from "@/lib/request-region";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/;
const DESCRIPTION_LIMIT = 300;
const IMAGE_LIMIT = 6;

type QuickViewPayload = {
  title: string;
  slug: string;
  price: string;
  oldPrice: string;
  discount: string;
  description: string;
  images: { src: string; alt: string }[];
  options: FlProduct["options"];
  variants: FlVariant[];
  purchasable: boolean;
};

function payloadFor(product: FlProduct, variants: FlVariant[]): QuickViewPayload {
  return {
    title: product.title,
    slug: product.slug,
    price: product.price,
    oldPrice: product.oldPrice,
    discount: product.discount,
    description: product.description.slice(0, DESCRIPTION_LIMIT),
    images: product.localImages.slice(0, IMAGE_LIMIT),
    options: product.options,
    variants,
    purchasable: variants.length > 0,
  };
}

/**
 * Quick-view data: one product's essentials for the card modal. Local
 * catalogue first, then Medusa in the visitor's currency region. Unknown
 * slugs are a plain 404; a backend outage is 503 with a generic body that
 * leaks nothing about the failure.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const local = getFlProduct(slug);
  if (local) {
    const variants = getFlVariantMapping(local.id)?.variants ?? [];
    return NextResponse.json(payloadFor(local, flProductHasVariants(local) ? variants : []), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  try {
    const region = await getRequestRegion();
    const detail = await getMedusaProductBySlug(slug, region?.id);
    if (!detail) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(payloadFor(detail.product, detail.variants), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (!(error instanceof MedusaUnavailableError)) {
      console.error("[quickview] unexpected lookup failure", { slug });
      throw error;
    }
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
