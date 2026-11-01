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

const SAVE_DEBOUNCE_MS = 500;

type WishlistContextType = {
  items: WishlistItem[];
  count: number;
  has: (slug: string) => boolean;
  toggle: (item: Omit<WishlistItem, "addedAt">) => void;
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
 * customer metadata once per login, then write changes back debounced —
 * always carrying the existing metadata keys (see buildWishlistMetadata).
 * Signing out clears the list so one account never sees another's wishes.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, saveCustomerMetadata } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [saveError, setSaveError] = useState(false);
  const syncedUserId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<WishlistItem[] | null>(null);

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
    // Signed out (or signed out mid-session): never leak the previous list.
    if (syncedUserId.current !== null) {
      syncedUserId.current = null;
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

  // Debounced metadata write-back for signed-in visitors.
  useEffect(() => {
    if (pendingSave.current === null) return;
    const snapshot = pendingSave.current;
    pendingSave.current = null;
    const timer = setTimeout(async () => {
      try {
        await saveCustomerMetadata({ wishlist: snapshot });
        setSaveError(false);
      } catch {
        setSaveError(true);
        // Retry with the next change; the UI keeps the newer state.
        pendingSave.current = snapshot;
      }
    }, SAVE_DEBOUNCE_MS);
    saveTimer.current = timer;
    return () => clearTimeout(timer);
  }, [items, saveCustomerMetadata]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const apply = useCallback((next: WishlistItem[]) => {
    setItems(next);
    if (syncedUserId.current) {
      pendingSave.current = next;
    } else {
      writeStorage(next);
    }
  }, []);

  const toggle = useCallback(
    (item: Omit<WishlistItem, "addedAt">) => {
      const full: WishlistItem = { ...item, addedAt: new Date().toISOString() };
      apply(
        hasItem(items, full.slug) ? removeItem(items, full.slug) : addItem(items, full),
      );
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
  // crash: the wishlist simply reads empty and toggles into the void.
  if (context === undefined) {
    return {
      items: [],
      count: 0,
      has: () => false,
      toggle: () => {},
      remove: () => {},
      saveError: false,
    };
  }
  return context;
}
