import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MedusaUnavailableError } from "../medusa";
import { mergeSearchResults, searchMedusaProducts } from "../medusa-catalog";
import type { FlProduct } from "../florencess-catalog";
import type { StoreProduct } from "../types";

function medusaProduct(handle: string): StoreProduct {
  return {
    id: `prod_${handle.replace(/-/g, "")}`,
    title: handle,
    handle,
    description: "",
    thumbnail: null,
    images: [],
    options: [],
    variants: [],
  } as unknown as StoreProduct;
}

function flProduct(slug: string): FlProduct {
  return { slug, id: slug, title: slug } as unknown as FlProduct;
}

afterEach(() => {
  jest.useRealTimers();
});

describe("searchMedusaProducts", () => {
  it("drops products whose handle is shadowed by a local page", async () => {
    const fetch = jest.fn(async () => [
      medusaProduct("test-bag"),
      medusaProduct("cart"),
      medusaProduct("accordo-hobo-45773"),
    ]);

    const results = await searchMedusaProducts("bag", "reg_1", fetch);

    expect(results.map((product) => product.slug)).toEqual(["test-bag"]);
    expect(fetch).toHaveBeenCalledWith("bag", "reg_1");
  });

  it("returns an empty list without calling Medusa for a blank query", async () => {
    const fetch = jest.fn(async () => [medusaProduct("test-bag")]);

    await expect(searchMedusaProducts("   ", "reg_1", fetch)).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("turns a hanging backend into MedusaUnavailableError after the deadline", async () => {
    jest.useFakeTimers();
    const fetch = jest.fn(() => new Promise<StoreProduct[]>(() => {}));

    const pending = searchMedusaProducts("bag", "reg_1", fetch);
    jest.advanceTimersByTime(3000);

    await expect(pending).rejects.toBeInstanceOf(MedusaUnavailableError);
  });

  it("passes backend failures through as MedusaUnavailableError", async () => {
    const fetch = jest.fn(async () => {
      throw new MedusaUnavailableError();
    });

    await expect(searchMedusaProducts("bag", "reg_1", fetch)).rejects.toBeInstanceOf(
      MedusaUnavailableError,
    );
  });
});

describe("mergeSearchResults", () => {
  it("lists Medusa matches first, then local matches, without duplicate slugs", () => {
    const merged = mergeSearchResults(
      [flProduct("test-bag"), flProduct("test-shoe")],
      [flProduct("local-tote"), flProduct("test-bag")],
    );

    expect(merged.map((product) => product.slug)).toEqual(["test-bag", "test-shoe", "local-tote"]);
  });

  it("does not mutate its inputs", () => {
    const medusa = [flProduct("test-bag")];
    const local = [flProduct("local-tote")];

    mergeSearchResults(medusa, local);

    expect(medusa).toHaveLength(1);
    expect(local).toHaveLength(1);
  });
});
