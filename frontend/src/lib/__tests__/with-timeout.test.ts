import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import {
  REGION_LOOKUP_TIMEOUT_MS,
  withMedusaTimeout,
} from "@/lib/with-timeout";
import { MedusaUnavailableError } from "@/lib/medusa";

describe("withMedusaTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the value when the promise settles within the budget", async () => {
    const value = await withMedusaTimeout(
      Promise.resolve("ok"),
      REGION_LOOKUP_TIMEOUT_MS,
      "test",
    );
    expect(value).toBe("ok");
  });

  it("rejects with MedusaUnavailableError when the promise hangs", async () => {
    const hung = new Promise<string>(() => {});
    const race = withMedusaTimeout(hung, REGION_LOOKUP_TIMEOUT_MS, "test");
    await expect(
      Promise.race([
        race.then(() => "resolved").catch((error) => error),
        jest.advanceTimersByTimeAsync(REGION_LOOKUP_TIMEOUT_MS).then(() => "advanced"),
      ]),
    ).resolves.toBeInstanceOf(MedusaUnavailableError);
  });

  it("propagates the original error when the promise fails fast", async () => {
    await expect(
      withMedusaTimeout(Promise.reject(new Error("refused")), REGION_LOOKUP_TIMEOUT_MS, "test"),
    ).rejects.toThrow("refused");
  });

  it("clears the timer once settled", async () => {
    await withMedusaTimeout(Promise.resolve(1), REGION_LOOKUP_TIMEOUT_MS, "test");
    // With the promise settled, advancing far past the budget must not
    // produce a stray rejection.
    await jest.advanceTimersByTimeAsync(REGION_LOOKUP_TIMEOUT_MS * 3);
    await expect(Promise.resolve()).resolves.toBeUndefined();
  });

  it("uses a three-second budget by default", () => {
    expect(REGION_LOOKUP_TIMEOUT_MS).toBe(3000);
  });
});
