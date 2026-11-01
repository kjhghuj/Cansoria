import { describe, expect, it } from "@jest/globals";
import { createCustomerMetadataWriter } from "@/lib/customer-metadata-writer";

/**
 * Fake Medusa backend reproducing mergeMetadata semantics
 * (@medusajs/utils/dist/common/merge-metadata.js): keys merge by name and an
 * empty-string value deletes the key.
 */
function fakeBackend(initial: Record<string, unknown> = {}) {
  const calls: Array<Record<string, unknown>> = [];
  let metadata = { ...initial };
  const write = async (patch: Record<string, unknown>) => {
    calls.push(patch);
    const merged = { ...metadata };
    for (const [key, value] of Object.entries(patch)) {
      if (value === "") delete merged[key];
      else merged[key] = value;
    }
    metadata = merged;
    return { id: "cus_1", metadata: { ...metadata } };
  };
  return {
    write,
    calls,
    read: () => ({ ...metadata }),
  };
}

describe("createCustomerMetadataWriter", () => {
  it("keeps wishlist and active_cart_id when written in either order", async () => {
    for (const order of ["wishlist-first", "cart-first"] as const) {
      const backend = fakeBackend({ theme: "dark" });
      const save = createCustomerMetadataWriter(backend.write);
      if (order === "wishlist-first") {
        await save({ wishlist: [{ slug: "bag" }] });
        await save({ active_cart_id: "cart_1" });
      } else {
        await save({ active_cart_id: "cart_1" });
        await save({ wishlist: [{ slug: "bag" }] });
      }
      const final = backend.read();
      expect(final.wishlist).toEqual([{ slug: "bag" }]);
      expect(final.active_cart_id).toBe("cart_1");
      // Untouched keys survive regardless of write order.
      expect(final.theme).toBe("dark");
    }
  });

  it("serializes concurrent writes so no patch is lost", async () => {
    const backend = fakeBackend();
    const save = createCustomerMetadataWriter(backend.write);
    await Promise.all([
      save({ wishlist: ["a"] }).catch(() => {}),
      save({ active_cart_id: "cart_1" }).catch(() => {}),
      save({ theme: "blue" }).catch(() => {}),
    ]);
    const final = backend.read();
    expect(final).toEqual({ wishlist: ["a"], active_cart_id: "cart_1", theme: "blue" });
  });

  it("resolves each save with the backend's returned customer", async () => {
    const backend = fakeBackend({ keep: true });
    const save = createCustomerMetadataWriter(backend.write);
    const customer = await save({ wishlist: [] });
    expect(customer.metadata).toEqual({ keep: true, wishlist: [] });
  });

  it("keeps the queue usable after a failed write", async () => {
    let failures = 0;
    const backend = fakeBackend();
    const flaky = async (patch: Record<string, unknown>) => {
      if (patch.theme !== undefined && failures === 0) {
        failures += 1;
        throw new Error("offline");
      }
      return backend.write(patch);
    };
    const save = createCustomerMetadataWriter(flaky);
    await expect(save({ theme: "red" })).rejects.toThrow("offline");
    const customer = await save({ active_cart_id: "cart_2" });
    expect(customer.metadata?.active_cart_id).toBe("cart_2");
  });

  it("never runs two writes at the same time", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const backend = fakeBackend();
    const tracked = async (patch: Record<string, unknown>) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return backend.write(patch);
    };
    const save = createCustomerMetadataWriter(tracked);
    await Promise.all([save({ a: 1 }), save({ b: 2 }), save({ c: 3 })]);
    expect(maxInFlight).toBe(1);
  });
});
