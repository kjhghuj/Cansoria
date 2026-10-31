import manifestJson from "@/data/florencess-brand-manifest.json";
import { getFlProductById, type FlProduct } from "./florencess-catalog";

type BrandEntry = {
  slug: string;
  manufacturerId: string;
  canonical: string;
  source: string;
  sourceSha256: string;
  sourceTotal: number | null;
  sourcePages: number | null;
  capturedPage: number;
  productIds: string[];
  localProductIds: string[];
};

const entries = manifestJson.brands as Record<string, BrandEntry>;

/** A missing page or missing local ID is unknown, never an inferred membership. */
export function flBrandListing(slug: string): (BrandEntry & { products: FlProduct[] }) | undefined {
  const entry = entries[slug];
  if (!entry) return undefined;
  const products = entry.localProductIds
    .map((id) => getFlProductById(id))
    .filter((product): product is FlProduct => product !== undefined);
  return { ...entry, products };
}
