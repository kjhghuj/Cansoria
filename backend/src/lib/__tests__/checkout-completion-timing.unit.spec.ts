import { Readable } from "stream";
import { signPhoto } from "../portrait-photos";
import { validateCheckoutCompletion } from "../checkout-completion";

// Native decodes need real event-loop turns that a fake clock does not
// provide; this suite exercises only the stream/budget plumbing of photo
// validation, so sharp stands in as an instantly-decodable image.
jest.mock("sharp", () => {
  const mockSharp = jest.fn(() => ({
    toBuffer: async () => ({
      data: Buffer.alloc(1),
      info: { width: 2, height: 2, format: "png" },
    }),
  }));
  return { __esModule: true, default: mockSharp };
});

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);

function fixture() {
  const photo = signPhoto({
    id: "2c0e1371-36f3-40a7-b8c7-861f3c185559",
    cart_id: "cart_a",
    file_id: "file_a",
    name: "pet.png",
    mime: "image/png",
    size: png.length,
  });
  const cart = {
    id: "cart_a",
    email: "owner@example.com",
    metadata: { portrait_photos: [photo] },
    items: [],
    shipping_methods: [],
    promotions: [],
    payment_collection: {
      payment_sessions: [{ provider_id: "pp_stripe_stripe", status: "authorized" }],
    },
  } as any;
  const graph = jest.fn(async ({ entity }) => ({
    data:
      entity === "order_cart"
        ? []
        : entity === "product"
          ? [{ id: "prod_a", handle: "pet-portrait-oil-painting" }]
          : [],
  }));
  const files = { getDownloadStream: jest.fn() };
  const container = {
    resolve: (key: string) =>
      ({
        query: { graph },
        file: files,
        promotion: { listPromotions: jest.fn(async () => []) },
        store: { listStores: jest.fn(async () => [{ metadata: null }]) },
      })[key],
  } as any;
  return { cart, photo, files, container, run: () => validateCheckoutCompletion({ id: "cart_a" }, cart, container) };
}

describe("sequential photo budget", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  afterEach(() => jest.useRealTimers());
  it("bounds all sequential photos to 25 seconds and destroys a late final stream", async () => {
    jest.useFakeTimers();
    const f = fixture();
    const streams: Readable[] = [];
    for (let i = 0; i < 6; i++) {
      const photo = signPhoto({
        ...f.photo,
        id: `${String(i).padStart(8, "0")}-36f3-40a7-b8c7-861f3c185559`,
        file_id: `file_${i}`,
      });
      (f.cart.metadata as any).portrait_photos.push(photo);
      f.cart.items.push({
        product_id: "prod_a",
        variant: { product: { id: "prod_a" } },
        metadata: { portrait: { style: "classic-oil", source_cart_id: "cart_a", photo_id: photo.id } },
        adjustments: [],
      });
    }
    f.files.getDownloadStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            const stream = Readable.from([png]);
            streams.push(stream);
            resolve(stream);
          }, 4500);
        }),
    );
    const check = expect(f.run()).rejects.toMatchObject({
      message: "Photo validation timed out",
    });
    await jest.advanceTimersByTimeAsync(25001);
    await check;
    expect(f.files.getDownloadStream).toHaveBeenCalledTimes(6);
    await jest.advanceTimersByTimeAsync(3000);
    expect(streams.every((s) => s.destroyed)).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
