/**
 * Serialized customer-metadata writer.
 *
 * Medusa merges customer metadata key-by-key
 * (node_modules/@medusajs/utils/dist/common/merge-metadata.js: an absent key
 * is preserved, "" deletes the key), so callers only send the key they own —
 * the wishlist writer can never clobber active_cart_id and vice versa. This
 * queue keeps those writes from interleaving so every patch lands on a
 * request that the backend applies in order, and each save resolves with the
 * customer the backend returned (fresh metadata for state updates).
 */
export function createCustomerMetadataWriter(
  write: (patch: Record<string, unknown>) => Promise<{ metadata?: Record<string, unknown> }>,
): (patch: Record<string, unknown>) => Promise<{ metadata?: Record<string, unknown> }> {
  let chain: Promise<unknown> = Promise.resolve();
  return function saveCustomerMetadata(patch: Record<string, unknown>) {
    const run = chain.then(() => write(patch));
    // A failed write must not poison the queue for later writes.
    chain = run.catch(() => null);
    return run;
  };
}
