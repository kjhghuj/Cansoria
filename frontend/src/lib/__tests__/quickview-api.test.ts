jest.mock("../medusa-catalog", () => ({
  getMedusaProductBySlug: jest.fn(),
}));
jest.mock("../request-region", () => ({
  getRequestRegion: jest.fn(async () => ({ id: "reg_test", currency_code: "usd" })),
}));

import { GET } from "@/app/api/quickview/[slug]/route";
import { getMedusaProductBySlug } from "../medusa-catalog";
import { MedusaUnavailableError } from "../medusa";

const mockedMedusa = getMedusaProductBySlug as jest.Mock;

function call(slug: string) {
  return GET(new Request(`https://shop.test/api/quickview/${slug}`), {
    params: Promise.resolve({ slug }),
  } as never);
}

beforeAll(() => {
  mockedMedusa.mockReset();
});

describe("quickview endpoint", () => {
  it("serves a local catalogue product with 200", async () => {
    const response = await call("accordo-hobo-45773");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.slug).toBe("accordo-hobo-45773");
    expect(typeof payload.title).toBe("string");
    expect(Array.isArray(payload.images)).toBe(true);
    expect(payload.images.length).toBeLessThanOrEqual(6);
    expect(payload.description.length).toBeLessThanOrEqual(300);
    expect(payload.purchasable).toBe(false);
  });

  it("rejects malformed slugs with 400", async () => {
    for (const slug of ["UPPER", "has space", "../etc/passwd", "x".repeat(300), ""]) {
      const response = await call(slug);
      expect(response.status).toBe(400);
    }
  });

  it("returns 404 when neither catalogue knows the slug", async () => {
    mockedMedusa.mockResolvedValue(null);
    const response = await call("definitely-not-a-product");
    expect(response.status).toBe(404);
  });

  it("returns 503 with a generic error when Medusa is down", async () => {
    mockedMedusa.mockRejectedValue(new MedusaUnavailableError());
    const response = await call("medusa-only-bag");
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload).toEqual({ error: "unavailable" });
  });

  it("serves a Medusa product with purchasable variants", async () => {
    mockedMedusa.mockResolvedValue({
      product: {
        id: "medusa:prod_1",
        slug: "medusa-bag",
        title: "Medusa Bag",
        model: "SKU",
        brand: "LORENCESS",
        description: "A bag.",
        price: "$129.00",
        oldPrice: "",
        discount: "",
        currency: "USD",
        availability: "InStock",
        options: [],
        localImages: [{ src: "/a.jpg", alt: "Medusa Bag" }],
        pageCaptured: true,
      },
      variants: [{ id: "variant_1", selection: { Color: "Black" } }],
    });
    const response = await call("medusa-bag");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.purchasable).toBe(true);
    expect(payload.variants).toEqual([{ id: "variant_1", selection: { Color: "Black" } }]);
    expect(payload.price).toBe("$129.00");
  });
});
