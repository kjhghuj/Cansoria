"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  WISHLIST_KEY,
  addItem,
  hasItem,
  mergeLists,
  parseWishlist,
  removeItem,
  type WishlistItem,
} from "./wishlist";
import { useAuth } from "./providers";
import { createDebouncedSaver, type DebouncedSaver } from "./debounced-save";

const SAVE_DEBOUNCE_MS = 500;

type WishlistContextType = {
  items: WishlistItem[];
  count: number;
  has: (slug: string) => boolean;
  /** Toggle a wish; returns false when the item was rejected (never added). */
  toggle: (item: Omit<WishlistItem, "addedAt">) => boolean;
  remove: (slug: string) => void;
  /** Set when the last account save failed; cleared on the next attempt. */
  saveError: boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

function readStorage(): string | null {
  try {
    return localStorage.getItem(WISHLIST_KEY);
  } catch {
    return null;
  }
}

function writeStorage(items: WishlistItem[]): void {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  } catch {
    // Storage disabled or full: the in-memory list still works.
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(WISHLIST_KEY);
  } catch {
    // Best-effort only.
  }
}

/**
 * Wishlist state. Guests persist to localStorage (kept in sync across tabs
 * via the storage event); signed-in visitors merge their guest list into
 * customer metadata once per login, then write changes back through a
 * debounced saver whose pending value is only consumed when the write starts
 * — a pending change can no longer be dropped by a re-render or unmount.
 * Signing out discards pending saves so one account never receives another's
 * wishes.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, saveCustomerMetadata } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [saveError, setSaveError] = useState(false);
  const syncedUserId = useRef<string | null>(null);
  const saver = useRef<DebouncedSaver<WishlistItem[]> | null>(null);

  // Debounced metadata writer for signed-in visitors; flushed on unmount so a
  // pending change goes out instead of being cancelled.
  useEffect(() => {
    saver.current = createDebouncedSaver(async (snapshot) => {
      try {
        await saveCustomerMetadata({ wishlist: snapshot });
        setSaveError(false);
      } catch (error) {
        setSaveError(true);
        // The saver keeps the value pending for the next change to retry.
        throw error;
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      saver.current?.flush();
      saver.current = null;
    };
  }, [saveCustomerMetadata]);

  // Load for the current visitor exactly once per account session.
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (syncedUserId.current === user.id) return;
      syncedUserId.current = user.id;
      const guest = parseWishlist(safeParse(readStorage()));
      const account = parseWishlist(user.metadata?.wishlist);
      const merged = mergeLists(guest, account);
      setItems(merged);
      clearStorage();
      if (guest.length) {
        saveCustomerMetadata({ wishlist: merged }).catch(() => {
          setSaveError(true);
        });
      }
      return;
    }
    // Signed out (or signed out mid-session): never leak the previous list,
    // and drop any unsaved change so it cannot reach the next account.
    if (syncedUserId.current !== null) {
      syncedUserId.current = null;
      saver.current?.discard();
      setItems([]);
      return;
    }
    setItems(parseWishlist(safeParse(readStorage())));
  }, [authLoading, user, saveCustomerMetadata]);

  // Cross-tab sync for guests.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== WISHLIST_KEY) return;
      if (syncedUserId.current) return;
      setItems(parseWishlist(safeParse(event.newValue)));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const apply = useCallback((next: WishlistItem[]) => {
    setItems(next);
    if (syncedUserId.current) {
      saver.current?.schedule(next);
    } else {
      writeStorage(next);
    }
  }, []);

  const toggle = useCallback(
    (item: Omit<WishlistItem, "addedAt">): boolean => {
      const full: WishlistItem = { ...item, addedAt: new Date().toISOString() };
      if (hasItem(items, full.slug)) {
        apply(removeItem(items, full.slug));
        return true;
      }
      const next = addItem(items, full);
      const saved = hasItem(next, full.slug);
      if (saved) apply(next);
      return saved;
    },
    [items, apply],
  );

  const remove = useCallback(
    (slug: string) => {
      apply(removeItem(items, slug));
    },
    [items, apply],
  );

  const value = useMemo<WishlistContextType>(
    () => ({
      items,
      count: items.length,
      has: (slug: string) => hasItem(items, slug),
      toggle,
      remove,
      saveError,
    }),
    [items, toggle, remove, saveError],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  // Cards rendered outside the full app shell (tests, legacy pages) must not
  // crash: the wishlist simply reads empty and toggles report rejection.
  if (context === undefined) {
    return {
      items: [],
      count: 0,
      has: () => false,
      toggle: () => false,
      remove: () => {},
      saveError: false,
    };
  }
  return context;
}
