import { describe, expect, test } from "@jest/globals";
import { SITE_NAME, pageTitle, siteUrl } from "../brand";
import { FL_BRAND } from "../florencess-data";

describe("storefront brand", () => {
  test("uses LORENCESS as the visible store name", () => {
    expect(SITE_NAME).toBe("LORENCESS");
    expect(FL_BRAND).toBe(SITE_NAME);
  });

  test("builds page titles with the store name suffix", () => {
    expect(pageTitle("Cart")).toBe("Cart | LORENCESS");
  });

  test("falls back to the store name when no label is given", () => {
    expect(pageTitle()).toBe("LORENCESS");
    expect(pageTitle("   ")).toBe("LORENCESS");
  });

  test("never falls back to the reference site's domain", () => {
    expect(siteUrl()).not.toContain("entntnt");
  });
});
