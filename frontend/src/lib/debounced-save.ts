/**
 * Debounced save queue for one value.
 *
 * The pending value is consumed only when the write actually starts, so
 * nothing between `schedule` and the deadline (re-renders, effect cleanups in
 * StrictMode) can drop it. A failed write keeps its value pending for the
 * next schedule or flush to retry — a newer schedule always wins over the
 * retry copy. `discard` is the sign-out path: the pending value is dropped so
 * it can never be written to the next account.
 */
export type DebouncedSaver<T> = {
  schedule: (value: T) => void;
  /** Write now if a value is pending; never waits for the delay. */
  flush: () => void;
  /** Drop any pending value. */
  discard: () => void;
};

export function createDebouncedSaver<T>(
  write: (value: T) => Promise<unknown>,
  delayMs: number,
): DebouncedSaver<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fire = () => {
    timer = null;
    const snapshot = pending;
    pending = null;
    if (snapshot === null) return;
    write(snapshot.value).catch(() => {
      // Keep the value for a later retry, unless a newer value already
      // replaced it.
      if (pending === null) pending = snapshot;
    });
  };

  return {
    schedule(value: T) {
      pending = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, delayMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      if (pending !== null) fire();
    },
    discard() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
