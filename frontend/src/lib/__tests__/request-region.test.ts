import { describe, expect, it } from "@jest/globals";
import { MedusaUnavailableError } from "@/lib/medusa";
import { resolveRegionWithFallback } from "@/lib/request-region";
import type { StoreRegion } from "@/lib/types";

const na = { id: "reg_na", currency_code: "usd", name: "North America" } as StoreRegion;
const eu = { id: "reg_eu", currency_code: "eur", name: "Europe" } as StoreRegion;

describe("resolveRegionWithFallback", () => {
  it("returns the cookie region when it exists in the list", async () => {
    const region = await resolveRegionWithFallback(
      "reg_eu",
      async () => [na, eu],
      async () => na,
    );
    expect(region).toBe(eu);
  });

  it("falls back to the default when the region list times out", async () => {
    const region = await resolveRegionWithFallback(
      undefined,
      async () => {
        throw new MedusaUnavailableError("region list timed out");
      },
      async () => na,
    );
    expect(region).toBe(na);
  });

  it("returns null when both lookups time out", async () => {
    const region = await resolveRegionWithFallback(
      undefined,
      async () => {
        throw new MedusaUnavailableError("region list timed out");
      },
      async () => {
        throw new MedusaUnavailableError("default region timed out");
      },
    );
    expect(region).toBeNull();
  });

  it("returns the first listed region when the default times out but the list worked", async () => {
    const region = await resolveRegionWithFallback(
      undefined,
      async () => [eu, na],
      async () => {
        throw new MedusaUnavailableError("default region timed out");
      },
    );
    expect(region).toBe(eu);
  });

  it("ignores cookie values naming unknown regions", async () => {
    const region = await resolveRegionWithFallback(
      "reg_gone",
      async () => [na],
      async () => na,
    );
    expect(region).toBe(na);
  });
});
