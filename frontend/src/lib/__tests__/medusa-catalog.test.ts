import { describe, expect, it } from "@jest/globals";
import type { StoreProduct } from "@/lib/types";
import { MedusaUnavailableError } from "@/lib/medusa";
import {
  mapMedusaProduct,
  mapMedusaVariants,
  resolveStorefrontSlug,
} from "@/lib/medusa-catalog";

type VariantFixture = {
  id: string;
  sku?: string;
  manage_inventory?: boolean;
  inventory_quantity?: number | null;
  calculated_price?: {
    calculated_amount: number | null;
    original_amount?: number | null;
    currency_code?: string;
  } | null;
  options?: { option_id?: string; value: string; option?: { title: string } }[];
};

type ProductFixture = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  images?: { url: string; rank?: number | null }[];
  options?: { id: string; title: string; values?: { id?: string; value: string }[] }[];
  variants?: VariantFixture[];
};

function fixture(overrides: ProductFixture): StoreProduct {
  return overrides as unknown as StoreProduct;
}

const colorOptions = [
  {
    id: "opt_color",
    title: "Color",
    values: [
      { id: "val_black", value: "Black" },
      { id: "val_tan", value: "Tan" },
    ],
  },
];

describe("mapMedusaProduct", () => {
  it("maps identity, brand, model and cleans HTML descriptions", () => {
    const product = mapMedusaProduct(
      fixture({
        id: "prod_1",
        handle: "test-bag",
        title: "Test Bag",
        description: "<p>Sturdy <b>canvas</b> lining.</p>",
        metadata: { brand: "LORENCESS" },
        options: colorOptions,
        variants: [
          { id: "variant_1", sku: "SKU-BLK", calculated_price: { calculated_amount: 129, currency_code: "usd" }, options: [{ option_id: "opt_color", value: "Black" }] },
        ],
      }),
      "usd",
    );
    expect(product.id).toBe("medusa:prod_1");
    expect(product.slug).toBe("test-bag");
    expect(product.brand).toBe("LORENCESS");
    expect(product.model).toBe("SKU-BLK");
    expect(product.description).toBe("Sturdy canvas lining.");
    expect(product.price).toBe("$129.00");
    expect(product.oldPrice).toBe("");
    expect(product.discount).toBe("");
  });

  it("marks a verified discount with the rounded percentage", () => {
    const product = mapMedusaProduct(
      fixture({
        id: "prod_2",
        handle: "sale-bag",
        title: "Sale Bag",
        variants: [
          { id: "variant_1", calculated_price: { calculated_amount: 100, original_amount: 125, currency_code: "usd" } },
        ],
      }),
      "usd",
    );
    expect(product.price).toBe("$100.00");
    expect(product.oldPrice).toBe("$125.00");
    expect(product.discount).toBe("-20%");
  });

  it("keeps oldPrice empty when the original amount is not higher", () => {
    const product = mapMedusaProduct(
      fixture({
        id: "prod_3",
        handle: "flat-bag",
        title: "Flat Bag",
        variants: [
          { id: "variant_1", calculated_price: { calculated_amount: 100, original_amount: 100, currency_code: "usd" } },
        ],
      }),
      "usd",
    );
    expect(product.oldPrice).toBe("");
    expect(product.discount).toBe("");
  });

  it("reports an empty price string rather than a zero amount", () => {
    const product = mapMedusaProduct(
      fixture({
        id: "prod_4",
        handle: "priceless-bag",
        title: "Priceless Bag",
        variants: [{ id: "variant_1", calculated_price: null }],
      }),
      "usd",
    );
    expect(product.price).toBe("");
    expect(product.oldPrice).toBe("");
    expect(product.discount).toBe("");
  });

  it("orders images by rank and falls back to the thumbnail", () => {
    const withImages = mapMedusaProduct(
      fixture({
        id: "prod_5",
        handle: "imaged-bag",
        title: "Imaged Bag",
        images: [
          { url: "/second.png", rank: 2 },
          { url: "/first.png", rank: 1 },
        ],
      }),
      "usd",
    );
    expect(withImages.localImages.map((image) => image.src)).toEqual([
      "/first.png",
      "/second.png",
    ]);

    const thumbnailOnly = mapMedusaProduct(
      fixture({
        id: "prod_6",
        handle: "thumb-bag",
        title: "Thumb Bag",
        thumbnail: "/thumb.png",
        images: [],
      }),
      "usd",
    );
    expect(thumbnailOnly.localImages).toEqual([{ src: "/thumb.png", alt: "Thumb Bag" }]);
  });

  it("maps options with deduplicated values", () => {
    const product = mapMedusaProduct(
      fixture({
        id: "prod_7",
        handle: "optioned-bag",
        title: "Optioned Bag",
        options: [
          {
            id: "opt_color",
            title: "Color",
            values: [
              { id: "v1", value: "Black" },
              { id: "v2", value: "Black" },
              { id: "v3", value: "Tan" },
            ],
          },
        ],
      }),
      "usd",
    );
    expect(product.options).toHaveLength(1);
    expect(product.options[0].name).toBe("Color");
    expect(product.options[0].values.map((value) => value.label)).toEqual(["Black", "Tan"]);
  });
});

describe("mapMedusaVariants", () => {
  it("resolves option names from the product options by option_id", () => {
    const variants = mapMedusaVariants(
      fixture({
        id: "prod_1",
        handle: "test-bag",
        title: "Test Bag",
        options: [
          ...colorOptions,
          { id: "opt_size", title: "Size", values: [{ value: "M" }] },
        ],
        variants: [
          {
            id: "variant_1",
            manage_inventory: true,
            inventory_quantity: 5,
            options: [
              { option_id: "opt_color", value: "Black" },
              { option_id: "opt_size", value: "M" },
            ],
          },
        ],
      }),
    );
    expect(variants).toEqual([{ id: "variant_1", selection: { Color: "Black", Size: "M" } }]);
  });

  it("drops sold-out managed variants from the purchasable list", () => {
    const variants = mapMedusaVariants(
      fixture({
        id: "prod_2",
        handle: "stocked-bag",
        title: "Stocked Bag",
        options: colorOptions,
        variants: [
          { id: "variant_in", manage_inventory: true, inventory_quantity: 3, options: [{ option_id: "opt_color", value: "Black" }] },
          { id: "variant_out", manage_inventory: true, inventory_quantity: 0, options: [{ option_id: "opt_color", value: "Tan" }] },
          { id: "variant_untracked", manage_inventory: false, inventory_quantity: 0, options: [{ option_id: "opt_color", value: "Black" }] },
        ],
      }),
    );
    expect(variants.map((variant) => variant.id)).toEqual(["variant_in", "variant_untracked"]);
  });
});

describe("resolveStorefrontSlug", () => {
  const deps = (overrides: {
    local?: (slug: string) => unknown;
    product?: (slug: string) => unknown;
    category?: (slug: string) => unknown;
  }) => {
    const calls: string[] = [];
    return {
      calls,
      deps: {
        resolveLocal: (slug: string) => {
          calls.push(`local:${slug}`);
          return (overrides.local?.(slug) ?? null) as ReturnType<
            typeof import("@/lib/florencess-routes").resolveFlSlug
          >;
        },
        fetchMedusaProduct: (async (slug: string) => {
          calls.push(`product:${slug}`);
          return ((await overrides.product?.(slug)) ?? null) as never;
        }) as never,
        fetchMedusaCategory: (async (slug: string) => {
          calls.push(`category:${slug}`);
          return ((await overrides.category?.(slug)) ?? null) as never;
        }) as never,
      },
    };
  };

  it("resolves a local category without touching Medusa", async () => {
    const localCategory = {
      kind: "category" as const,
      category: { slug: "bags-all", title: "Bags" },
    };
    const harness = deps({ local: () => localCategory });
    const result = await resolveStorefrontSlug("bags-all", undefined, harness.deps);
    expect(result).toEqual({ kind: "local", route: localCategory });
    expect(harness.calls).toEqual(["local:bags-all"]);
  });

  it("resolves a Medusa product when the local catalogue misses", async () => {
    const medusaProduct = {
      product: { id: "medusa:prod_1", slug: "test-bag", title: "Test Bag" },
      variants: [{ id: "variant_1", selection: { Color: "Black" } }],
    };
    const harness = deps({ product: () => medusaProduct });
    const result = await resolveStorefrontSlug("test-bag", "reg_na", harness.deps);
    expect(result).toEqual({ kind: "medusa-product", ...medusaProduct });
    expect(harness.calls).toEqual(["local:test-bag", "product:test-bag"]);
  });

  it("resolves a Medusa category when no product matches", async () => {
    const medusaCategory = { id: "pcat_1", name: "Bags", handle: "bags-all" };
    const harness = deps({ category: () => medusaCategory });
    const result = await resolveStorefrontSlug("bags-all", undefined, harness.deps);
    expect(result).toEqual({ kind: "medusa-category", category: medusaCategory });
    expect(harness.calls).toEqual(["local:bags-all", "product:bags-all", "category:bags-all"]);
  });

  it("returns null when nothing matches", async () => {
    const harness = deps({});
    expect(await resolveStorefrontSlug("missing", undefined, harness.deps)).toBeNull();
  });

  it("propagates MedusaUnavailableError from the product lookup", async () => {
    const harness = deps({
      product: () => {
        throw new MedusaUnavailableError();
      },
    });
    await expect(
      resolveStorefrontSlug("test-bag", undefined, harness.deps),
    ).rejects.toBeInstanceOf(MedusaUnavailableError);
  });
});
