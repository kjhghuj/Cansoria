jest.mock("../medusa", () => ({
  ...jest.requireActual("../medusa"),
  sdk: {
    store: {
      product: { list: jest.fn() },
      category: { list: jest.fn() },
    },
  },
}));

import { sdk, MedusaUnavailableError } from "../medusa";
import { isReservedSlug, listMedusaCategoryProducts } from "../medusa-catalog";

const productList = sdk.store.product.list as jest.Mock;

describe("isReservedSlug", () => {
  it("recognises static routes, local categories, products, articles and brands", () => {
    expect(isReservedSlug("cart")).toBe(true);
    expect(isReservedSlug("search")).toBe(true);
    expect(isReservedSlug("bags-all")).toBe(true);
    expect(isReservedSlug("accordo-hobo-45773")).toBe(true);
    expect(isReservedSlug("about-us")).toBe(true);
  });

  it("lets free Medusa handles through", () => {
    expect(isReservedSlug("test-bag")).toBe(false);
    expect(isReservedSlug("new-arrival")).toBe(false);
    expect(isReservedSlug("")).toBe(false);
  });
});

describe("listMedusaCategoryProducts", () => {
  beforeEach(() => {
    productList.mockReset();
  });

  it("skips products whose handle is shadowed by a local page", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    productList.mockResolvedValue({
      products: [
        { id: "prod_ok", handle: "fine-medusa-bag", title: "Fine Bag" },
        { id: "prod_shadow_route", handle: "cart", title: "Cart Impostor" },
        { id: "prod_shadow_product", handle: "accordo-hobo-45773", title: "Duplicate" },
      ],
      count: 3,
    });

    const products = await listMedusaCategoryProducts("pcat_1");

    expect(products.map((product) => product.handle)).toEqual(["fine-medusa-bag"]);
    expect(errorSpy).toHaveBeenCalledWith(
      "[medusa-catalog] handle shadowed",
      expect.objectContaining({ handle: "cart" }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[medusa-catalog] handle shadowed",
      expect.objectContaining({ handle: "accordo-hobo-45773" }),
    );
    errorSpy.mockRestore();
  });

  it("keeps paging on the raw page length, not the filtered one", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const fullPage = Array.from({ length: 100 }, (_, index) => ({
      id: `prod_${index}`,
      handle: index === 0 ? "cart" : `medusa-item-${index}`,
      title: `Item ${index}`,
    }));
    productList
      .mockResolvedValueOnce({ products: fullPage, count: 150 })
      .mockResolvedValueOnce({ products: [{ id: "prod_last", handle: "medusa-item-last", title: "Last" }], count: 150 });

    const products = await listMedusaCategoryProducts("pcat_1");

    expect(productList).toHaveBeenCalledTimes(2);
    expect(products).toHaveLength(100);
    errorSpy.mockRestore();
  });

  it("surfaces a backend outage as MedusaUnavailableError", async () => {
    productList.mockRejectedValue(new Error("socket hang up"));
    await expect(listMedusaCategoryProducts("pcat_1")).rejects.toBeInstanceOf(
      MedusaUnavailableError,
    );
  });
});
