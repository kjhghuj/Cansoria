import {
  confirmDelivery,
  deliveryDetailsKey,
  hasAuthorizedStripePayment,
  paymentTotalsMatch,
  prepareDelivery,
  type DeliveryDetails,
} from "../checkout-delivery";
import type { StoreCart } from "../types";

const details: DeliveryDetails = {
  name: " Test Buyer ",
  email: "buyer@example.test",
  phone: "0000000000",
  address: "Test street",
  city: "London",
  postalCode: "SW1A 1AA",
  country: "gb",
};
const options = [
  { id: "so_standard", name: "Standard", amount: 9 },
  { id: "so_express", name: "Express", amount: 18 },
];
const originalFetch = global.fetch;
const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe("delivery before payment", () => {
  it("saves the address and lists choices without selecting or charging anything", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shipping_options: options }),
      });
    expect(await prepareDelivery("cart_test", details)).toEqual(options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.shipping_address).toMatchObject({
      first_name: "Test",
      last_name: "Buyer",
      country_code: "gb",
    });
    expect(body.billing_address).toEqual(body.shipping_address);
    expect(fetchMock.mock.calls[1][0]).toContain(
      "shipping-options?cart_id=cart_test",
    );
  });
  it("stops when address persistence or delivery lookup fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(prepareDelivery("cart_test", details)).rejects.toThrow(
      "Unable to save",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    await expect(prepareDelivery("cart_test", details)).rejects.toThrow(
      "Unable to load delivery",
    );
  });
  it("requires an available choice and honors the user's express selection", async () => {
    await expect(
      confirmDelivery("cart_test", "so_unknown", options),
    ).rejects.toThrow("available");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce({ ok: true });
    await confirmDelivery("cart_test", "so_express", options);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      option_id: "so_express",
    });
  });
  it("reports failed delivery selection before payment can proceed", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(
      confirmDelivery("cart_test", "so_standard", options),
    ).rejects.toThrow("before paying");
  });
  it("invalidates confirmation after changing country, address, email, or cart", () => {
    const key = deliveryDetailsKey("cart_test", details);
    expect(
      deliveryDetailsKey("cart_test", { ...details, name: "Test Buyer" }),
    ).toBe(key);
    for (const update of [
      { country: "us" },
      { address: "Another street" },
      { email: "other@example.test" },
    ])
      expect(
        deliveryDetailsKey("cart_test", { ...details, ...update }),
      ).not.toBe(key);
    expect(deliveryDetailsKey("cart_other", details)).not.toBe(key);
  });
});

describe("reviewed payment total", () => {
  const cart = {
    id: "cart_test",
    total: 103.02,
    currency_code: "gbp",
    items: [{ id: "item_1", quantity: 1, total: 85.02 }],
    shipping_methods: [{ shipping_option_id: "so_express" }],
  } as StoreCart;
  it("accepts the reviewed total, including a fully discounted total", () => {
    expect(paymentTotalsMatch(cart, { ...cart })).toBe(true);
    expect(
      paymentTotalsMatch({ ...cart, total: 0 }, { ...cart, total: 0 }),
    ).toBe(true);
  });
  it("rejects changed totals, currency, shipping, quantities, and completed carts", () => {
    for (const update of [
      { total: 104 },
      { total: NaN },
      { currency_code: "usd" },
      { shipping_methods: [] },
      { email: "other@example.test" },
      { shipping_address: { address_1: "Changed street" } },
      { completed_at: "2026-10-08" },
      { items: [{ ...cart.items![0], quantity: 2 }] },
    ])
      expect(
        paymentTotalsMatch(cart, { ...cart, ...update } as StoreCart),
      ).toBe(false);
  });
  it("resumes confirmation for an authorized Stripe session without initializing another payment", () => {
    const withSession = (provider_id: string, status: string) =>
      ({
        ...cart,
        payment_collection: { payment_sessions: [{ provider_id, status }] },
      }) as unknown as StoreCart;
    expect(
      hasAuthorizedStripePayment(withSession("pp_stripe_stripe", "authorized")),
    ).toBe(true);
    expect(
      hasAuthorizedStripePayment(withSession("pp_stripe_stripe", "pending")),
    ).toBe(false);
    expect(
      hasAuthorizedStripePayment(
        withSession("pp_system_default", "authorized"),
      ),
    ).toBe(false);
    expect(hasAuthorizedStripePayment(null)).toBe(false);
  });
});
