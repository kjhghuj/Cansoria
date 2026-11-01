import { describe, expect, it } from "@jest/globals";
import {
  REGION_COOKIE,
  currencyLabel,
  isValidRegionId,
  pickRegion,
} from "@/lib/lorencess-region";
import type { StoreRegion } from "@/lib/types";

function region(id: string, currencyCode: string, name = id): StoreRegion {
  return { id, currency_code: currencyCode, name } as StoreRegion;
}

const regions = [
  region("reg_na", "usd", "North America"),
  region("reg_eu", "eur", "Europe"),
];

describe("isValidRegionId", () => {
  it("accepts real Medusa region ids only", () => {
    expect(isValidRegionId("reg_na")).toBe(true);
    expect(isValidRegionId("reg_01M462AK8V85RZSY")).toBe(true);
    expect(isValidRegionId("reg_" + "a".repeat(64))).toBe(true);
  });

  it("rejects malformed or hostile cookie values", () => {
    expect(isValidRegionId("")).toBe(false);
    expect(isValidRegionId("reg_")).toBe(false);
    expect(isValidRegionId("prod_1")).toBe(false);
    expect(isValidRegionId("reg_a b")).toBe(false);
    expect(isValidRegionId("reg_;path=/")).toBe(false);
    expect(isValidRegionId("reg_" + "a".repeat(65))).toBe(false);
    expect(isValidRegionId(null)).toBe(false);
    expect(isValidRegionId(42)).toBe(false);
    expect(isValidRegionId({})).toBe(false);
  });
});

describe("pickRegion", () => {
  it("returns the cookie region when it exists in the store list", () => {
    expect(pickRegion("reg_eu", regions, regions[0])).toBe(regions[1]);
  });

  it("falls back to the default when the cookie is missing", () => {
    expect(pickRegion(undefined, regions, regions[0])).toBe(regions[0]);
    expect(pickRegion(null, regions, regions[0])).toBe(regions[0]);
  });

  it("falls back to the default when the cookie names an unknown region", () => {
    expect(pickRegion("reg_gone", regions, regions[0])).toBe(regions[0]);
  });

  it("rejects malformed cookie values without throwing", () => {
    expect(pickRegion("javascript:alert(1)", regions, regions[0])).toBe(regions[0]);
    expect(pickRegion("x".repeat(500), regions, regions[0])).toBe(regions[0]);
  });

  it("returns null only when there is nothing to fall back to", () => {
    expect(pickRegion("reg_eu", [], null)).toBeNull();
    expect(pickRegion("reg_eu", [], regions[0])).toBe(regions[0]);
  });

  it("exposes the documented cookie name", () => {
    expect(REGION_COOKIE).toBe("lorencess_region");
  });
});

describe("currencyLabel", () => {
  it("renders the code followed by the locale symbol", () => {
    expect(currencyLabel("usd")).toBe("USD $");
    expect(currencyLabel("EUR")).toBe("EUR €");
    expect(currencyLabel("gbp")).toBe("GBP £");
  });

  it("degrades to the code when the currency is unknown", () => {
    expect(currencyLabel("")).toBe("");
    expect(currencyLabel("not-a-code")).toBe("NOT-A-CODE");
  });
});
