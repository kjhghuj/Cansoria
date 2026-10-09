import { formatPrice, lowestProductPrice, toMinorUnits } from "../money";
import type { StoreProduct } from "../types";

describe("Medusa v2 money", () => {
  it("displays the amount Stripe will charge, including decimals and zero", () => {
    expect(formatPrice(85.02, "gbp")).toBe("£85.02");
    expect(formatPrice(8502, "gbp")).toBe("£8,502.00");
    expect(formatPrice(0, "usd")).toBe("US$0.00");
    expect(formatPrice(129, "jpy")).toBe("JP¥129");
    expect(formatPrice(undefined)).toBe("N/A");
    expect(formatPrice(NaN)).toBe("N/A");
  });
  it("only converts to minor units at the Stripe wallet boundary", () => {
    expect(toMinorUnits(85.02, "gbp")).toBe(8502);
    expect(toMinorUnits(129, "jpy")).toBe(129);
    expect(toMinorUnits(2.345, "kwd")).toBe(2345);
  });
  it("finds the true starting price without mixing currencies or losing free variants", () => {
    const product = {
      variants: [
        { calculated_price: { calculated_amount: 129, currency_code: "gbp" } },
        { calculated_price: { calculated_amount: 1, currency_code: "usd" } },
        {
          calculated_price: { calculated_amount: 85.02, currency_code: "gbp" },
        },
        { calculated_price: { calculated_amount: NaN, currency_code: "gbp" } },
      ],
    } as StoreProduct;
    expect(lowestProductPrice(product, "GBP")).toBe(85.02);
    expect(lowestProductPrice(product, "eur")).toBeUndefined();
    expect(lowestProductPrice({ variants: [] })).toBeUndefined();
    expect(
      lowestProductPrice({
        variants: [{ calculated_price: { calculated_amount: 0 } }],
      } as StoreProduct),
    ).toBe(0);
  });
});
