"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createCart,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  getRegion,
  listRegions,
  updateCartRegion,
  applyPromoCode,
  removePromoCode,
  createAndSelectStripePaymentSession,
  updateCustomerMetadata,
  updateCartOwnership,
  getCustomer,
  login,
  register,
  logout,
} from "@/lib/medusa";
import { StoreCart, StoreRegion } from "@/lib/types";
import {
  REGION_COOKIE,
  REGION_COOKIE_MAX_AGE,
  isValidRegionId,
  pickRegion,
} from "./lorencess-region";
import { createCustomerMetadataWriter } from "./customer-metadata-writer";
import { applyBestCoupon } from "./best-coupon";
import { WishlistProvider } from "./wishlist-context";

const CART_ID_KEY = "cansoria_cart_id";
const AUTH_TOKEN_KEY = "medusa_auth_token";

// Browser storage can be disabled, full, or throw on access. Cart/auth state
// commits independently of it: reads fall back to empty, writes are best-effort.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The cart or session still lives in memory and on the server.
  }
}
function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Removal is cosmetic; state below must still commit.
  }
}

// The region choice lives in a cookie so server components can render prices
// in the same currency the visitor picked (see request-region.ts).
function readRegionCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${REGION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(REGION_COOKIE.length + 1)) : undefined;
}

function writeRegionCookie(regionId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REGION_COOKIE}=${encodeURIComponent(regionId)}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; samesite=lax`;
}

interface ProvidersProps {
  children: ReactNode;
}

interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  metadata?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Serialized customer-metadata write. Medusa merges metadata key-by-key, so
   * pass only the key(s) you own (e.g. { active_cart_id }); the returned
   * customer carries the freshly merged metadata and `user` is refreshed.
   */
  saveCustomerMetadata: (
    patch: Record<string, unknown>,
  ) => Promise<{ metadata?: Record<string, unknown> }>;
}

interface CartContextType {
  cart: StoreCart | null;
  cartLoading: boolean;
  cartError: string | null;
  cartCount: number;
  addItem: (
    variantId: string,
    quantity?: number,
    customization?: import("./engraving").EngravingCustomization,
  ) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  ensureCart: () => Promise<StoreCart>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: (code: string) => Promise<boolean>;
  applyBetterCoupon: (
    code: string,
  ) => Promise<{ success: boolean; message: string }>;
  applySavedCoupons: (codes: unknown) => Promise<void>;
  createAndSelectStripePaymentSession: (cartId: string) => Promise<StoreCart>;
}

interface RegionContextType {
  region: StoreRegion | null;
  regionLoading: boolean;
  /** Every region the store actually configures; empty hides the switcher. */
  regions: StoreRegion[];
  regionSwitching: boolean;
  regionNotice: string | null;
  clearRegionNotice: () => void;
  /** Switch currency by switching region; moves the active cart along. */
  selectRegion: (regionId: string) => Promise<void>;
}

interface StoreStatusContextType {
  ordersOpen: boolean;
  storeStatusLoading: boolean;
  /** Newsletter entry is shown only when the whole delivery chain is configured. */
  newsletterEnabled: boolean;
}

// Contexts
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CartContext = createContext<CartContextType | undefined>(undefined);
const RegionContext = createContext<RegionContextType | undefined>(undefined);
const StoreStatusContext = createContext<StoreStatusContextType | undefined>(
  undefined,
);

function getProviderErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function getProviderErrorType(error: unknown) {
  return typeof error === "object" && error !== null && "type" in error
    ? error.type
    : undefined;
}

function isCompletedOrInvalidCartError(error: unknown) {
  const message = getProviderErrorMessage(error);
  const type = getProviderErrorType(error);
  return message.includes("already completed") || type === "invalid_data";
}

export function Providers({ children }: ProvidersProps) {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Cart State
  const [cart, setCartState] = useState<StoreCart | null>(null);
  const cartRef = useRef<StoreCart | null>(null);
  const setCart = useCallback((value: StoreCart | null) => {
    cartRef.current = value;
    setCartState(value);
  }, []);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const mutationPending = useRef(false);
  const cartRevision = useRef(0);
  const sessionGeneration = useRef(0);

  // Region State
  const [region, setRegion] = useState<StoreRegion | null>(null);
  const [regions, setRegions] = useState<StoreRegion[]>([]);
  const [regionLoading, setRegionLoading] = useState(true);
  const [regionSwitching, setRegionSwitching] = useState(false);
  const [regionNotice, setRegionNotice] = useState<string | null>(null);
  const router = useRouter();

  // Store commerce-readiness State (orders open/closed)
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [storeStatusLoading, setStoreStatusLoading] = useState(true);
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);

  // Serialized metadata writer: cart and wishlist writes land in order, each
  // on top of the backend's key-merge (never on a stale client copy).
  const metadataWriter = useRef(
    createCustomerMetadataWriter((patch) => updateCustomerMetadata(patch)),
  );
  const saveCustomerMetadata = useCallback(
    (patch: Record<string, unknown>) => {
      const generation = sessionGeneration.current;
      return metadataWriter.current(patch).then((customer) => {
        if (generation === sessionGeneration.current && customer) {
          setUser(customer as unknown as User);
        }
        return customer;
      });
    },
    [],
  );

  // Initialize Region: a validated cookie choice wins, else the store default.
  useEffect(() => {
    let cancelled = false;
    async function initRegion() {
      try {
        const all = await listRegions();
        if (cancelled) return;
        setRegions(all);
        const fromCookie = pickRegion(readRegionCookie(), all, null);
        const fallback = fromCookie ?? (await getRegion()) ?? all[0] ?? null;
        if (!cancelled) setRegion(fallback);
      } catch {
        try {
          const fallback = await getRegion();
          if (!cancelled && fallback) setRegion(fallback);
        } catch {
          // Region unavailable: cart init surfaces the error state.
        }
      } finally {
        if (!cancelled) setRegionLoading(false);
      }
    }
    initRegion();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize store status; a missing or failed response leaves orders closed.
  useEffect(() => {
    let cancelled = false;
    async function initStoreStatus() {
      try {
        const response = await fetch("/api/medusa/store/store-info");
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        if (data?.store?.orders_open === true) setOrdersOpen(true);
        if (
          data?.store?.capabilities?.newsletter === true &&
          process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        )
          setNewsletterEnabled(true);
      } catch {
      } finally {
        if (!cancelled) setStoreStatusLoading(false);
      }
    }
    initStoreStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize Auth
  useEffect(() => {
    async function initAuth() {
      // Remove credentials persisted by older storefront releases. Storage can be
      // disabled or full; cleanup must never block session initialization.
      removeStorage(AUTH_TOKEN_KEY);
      try {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } catch {
        // Best-effort cleanup only.
      }
      try {
        const customer = await getCustomer();
        if (customer) setUser(customer as unknown as User);
      } catch {
        // Treat an unavailable auth service as signed out; loading still ends.
      } finally {
        setAuthLoading(false);
      }
    }
    initAuth();
  }, []);

  // Initialize Cart (Dependent on Region and Auth)
  useEffect(() => {
    let cancelled = false;
    const generation = sessionGeneration.current;
    const revision = cartRevision.current;
    async function initCart() {
      if (authLoading || regionLoading) return;
      if (!region) {
        setCartError("The store region is unavailable. Your cart has been preserved; please retry shortly.");
        setCartLoading(false);
        return;
      }

      try {
        setCartLoading(true);
        setCartError(null);
        const cartIdToFetch = readStorage(CART_ID_KEY);
        let currentCart: StoreCart | null = null;

        // Strategy:
        // 1. If Logged In: Check Metadata for active_cart_id
        // 2. If valid metadata cart exists, use it (and sync local storage)
        // 3. If local storage cart exists, merge/claim it if no metadata cart, or just use it if unowned?
        //    Correction: If local cart exists and we are logged in, we should CLAIM it and save to metadata
        //    UNLESS we already have a saved cart in metadata.
        //    (Simpler: User's saved cart takes precedence. Or merge? Merging is complex. Let's start with User Saved Cart wins, or claiming local if user has none.)
        // 1. If Logged In: Check Metadata for active_cart_id
        if (user) {
          const userMetadata = user.metadata || {};
          const savedCartId = userMetadata.active_cart_id as string;
          if (savedCartId) {
            const savedCart = await getCart(savedCartId);
            if (cancelled || generation !== sessionGeneration.current) return;

            if (savedCart && !savedCart.completed_at) {
              currentCart = savedCart;
              writeStorage(CART_ID_KEY, savedCart.id);
            }
          }

          // If we still don't have a cart, but have a local one, try to claim it
          if (!currentCart && cartIdToFetch) {
            const localCart = await getCart(cartIdToFetch);
            if (cancelled || generation !== sessionGeneration.current) return;
            if (localCart && !localCart.completed_at) {
              // Assign to user
              await updateCartOwnership(localCart.id);
              if (cancelled || generation !== sessionGeneration.current) return;
              // Save to metadata (serialized; other keys merge server-side)
              await saveCustomerMetadata({ active_cart_id: localCart.id });
              currentCart = localCart;
            }
          }
        }

        // 4. If still no currentCart (Guest or User with no carts), try generic local storage fetch (Guest)
        if (!currentCart && cartIdToFetch) {
          const localCart = await getCart(cartIdToFetch);
          if (cancelled || generation !== sessionGeneration.current) return;
          if (localCart && !localCart.completed_at) {
            currentCart = localCart;
            // If user logged in (and flow reached here), ensure it's owned and saved
            if (user) {
              await updateCartOwnership(localCart.id);
              if (cancelled || generation !== sessionGeneration.current) return;
              await saveCustomerMetadata({ active_cart_id: localCart.id });
            }
          } else {
            removeStorage(CART_ID_KEY);
          }
        }

        // Restore only. A new cart requires an add or a valid photo selection.
        if (!cancelled && generation === sessionGeneration.current && revision === cartRevision.current)
          setCart(currentCart);
      } catch {
        if (!cancelled && generation === sessionGeneration.current && revision === cartRevision.current)
          setCartError("Unable to load your cart. Your existing cart reference is preserved; please retry.");
      } finally {
        if (!cancelled && generation === sessionGeneration.current && revision === cartRevision.current)
          setCartLoading(false);
      }
    }

    initCart();
    return () => {
      cancelled = true;
    };
  }, [region, regionLoading, authLoading, user, setCart, saveCustomerMetadata]); // Re-run when user changes (login/logout)

  // Auth Handlers
  const handleLogin = async (email: string, pass: string) => {
    // Don't set global auth loading to prevent unmounting the login form
    // setAuthLoading(true);
    try {
      await login(email, pass);
      const customer = await getCustomer();
      if (!customer) throw new Error("Unable to load your account.");
      sessionGeneration.current += 1;
      setCart(null);
      setUser(customer as unknown as User);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (
    email: string,
    pass: string,
    first: string,
    last: string,
  ) => {
    // Don't set global auth loading to prevent unmounting the register form
    // setAuthLoading(true);
    try {
      const result = await register(email, pass, first, last);
      sessionGeneration.current += 1;
      setCart(null);
      setUser(result.customer as unknown as User);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    await logout();
    sessionGeneration.current += 1;
    // Best-effort cache cleanup; the signed-out state below must always commit.
    removeStorage(AUTH_TOKEN_KEY);
    removeStorage(CART_ID_KEY);
    setUser(null);
    setCart(null);
    // The effect restores only; the next shopping action may create a guest cart.
  };

  // Cart Handlers (Wrapped to ensure check)
  const cartId = cart?.id;
  const refreshCart = useCallback(async () => {
    const id = cartId || readStorage(CART_ID_KEY);
    if (!id) {
      setCartError(region ? null : "The store region is unavailable. Please retry shortly.");
      return;
    }
    const generation = sessionGeneration.current;
    const revision = cartRevision.current;
    try {
      setCartLoading(true);
      const updatedCart = await getCart(id);
      if (
        generation !== sessionGeneration.current ||
        revision !== cartRevision.current
      )
        return;

      // If cart is completed OR if getCart returned null (invalid/not found), reset.
      if (!updatedCart || updatedCart.completed_at) {
        removeStorage(CART_ID_KEY);
        setCart(null);
        setCartError(null);

      } else {
        // Valid active cart
        setCart(updatedCart);
        setCartError(null);
      }
    } catch (error) {
      if (generation === sessionGeneration.current && revision === cartRevision.current)
        setCartError("Unable to refresh your cart. Your existing cart reference is preserved; please retry.");
      throw error;
    } finally {
      if (generation === sessionGeneration.current && revision === cartRevision.current)
        setCartLoading(false);
    }
  }, [cartId, region, setCart]);

  const runCartMutation = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      if (mutationPending.current)
        throw new Error("Your cart is updating. Please try again in a moment.");
      mutationPending.current = true;
      const generation = sessionGeneration.current;
      cartRevision.current += 1;
      setCartLoading(true);
      try {
        return await operation();
      } finally {
        cartRevision.current += 1;
        mutationPending.current = false;
        if (generation === sessionGeneration.current) setCartLoading(false);
      }
    },
    [],
  );

  const commitCart = useCallback(
    (updatedCart: StoreCart | null, generation: number) => {
      if (!updatedCart)
        throw new Error("Unable to update your cart. Please try again.");
      if (generation !== sessionGeneration.current)
        throw new Error("Your account changed. Please try again.");
      setCart(updatedCart);
    },
    [setCart],
  );

  const getOrCreateCart = useCallback(async (generation: number): Promise<StoreCart> => {
    const assertActive = () => {
      if (generation !== sessionGeneration.current)
        throw new Error("Your account changed. Please try again.");
    };
    assertActive();
    if (authLoading || regionLoading || !region)
      throw new Error("Your cart is not ready. Please try again.");
    let active = cartRef.current;
    if (!active || active.completed_at) {
      active = await createCart(region.id);
      assertActive();
      if (!active) throw new Error("Unable to create your cart. Please try again.");
      // Keep the successful creation for retry if later ownership/metadata writes fail.
      setCart(active);
      writeStorage(CART_ID_KEY, active.id);
    }
    if (user && active.customer_id !== user.id) {
      const owned = await updateCartOwnership(active.id) as StoreCart | null;
      assertActive();
      if (!owned) throw new Error("Unable to prepare your cart. Please try again.");
      active = owned;
      setCart(active);
    }
    if (user && user.metadata?.active_cart_id !== active.id) {
      await saveCustomerMetadata({ active_cart_id: active.id });
      assertActive();
    }
    return active;
  }, [authLoading, regionLoading, region, user, setCart, saveCustomerMetadata]);

  const ensureCart = useCallback(() => {
    const generation = sessionGeneration.current;
    return runCartMutation(() => getOrCreateCart(generation));
  }, [runCartMutation, getOrCreateCart]);

  const addItem = useCallback(
    async (
      variantId: string,
      quantity: number = 1,
      customization?: import("./engraving").EngravingCustomization,
    ) => {
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        try {
          const active = await getOrCreateCart(generation);
          const updatedCart = await addToCart(
            active.id,
            variantId,
            quantity,
            customization,
          );
          commitCart(updatedCart, generation);
        } catch (error: unknown) {
          // If "Cart is already completed", refresh to reset it
          if (isCompletedOrInvalidCartError(error)) {
            await refreshCart();
          }
          throw error;
        }
      });
    },
    [getOrCreateCart, refreshCart, runCartMutation, commitCart],
  );

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cartId)
        throw new Error("Your cart is not ready. Please try again.");
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        try {
          const updatedCart = await updateCartItem(
            cartId,
            lineItemId,
            quantity,
          );
          commitCart(updatedCart, generation);
        } catch (error: unknown) {
          if (isCompletedOrInvalidCartError(error)) {
            await refreshCart();
          }
          throw error;
        }
      });
    },
    [cartId, refreshCart, runCartMutation, commitCart],
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cartId)
        throw new Error("Your cart is not ready. Please try again.");
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        try {
          const updatedCart = await removeFromCart(cartId, lineItemId);
          commitCart(updatedCart, generation);
        } catch (error: unknown) {
          if (isCompletedOrInvalidCartError(error)) {
            await refreshCart();
          }
          throw error;
        }
      });
    },
    [cartId, refreshCart, runCartMutation, commitCart],
  );

  const applyPromoCodeHandler = useCallback(
    async (code: string): Promise<boolean> => {
      if (!cartId) return false;
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        const updatedCart = await applyPromoCode(cartId, code);
        commitCart(updatedCart, generation);
        return (
          updatedCart?.promotions?.some(
            (promotion) => promotion.code?.toUpperCase() === code.toUpperCase(),
          ) ?? false
        );
      });
    },
    [cartId, runCartMutation, commitCart],
  );

  const removePromoCodeHandler = useCallback(
    async (code: string): Promise<boolean> => {
      if (!cartId) return false;
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        const updatedCart = await removePromoCode(cartId, code);
        commitCart(updatedCart, generation);
        return updatedCart !== null && !updatedCart.promotions?.some(
          (promotion) => promotion.code?.toUpperCase() === code.toUpperCase(),
        );
      });
    },
    [cartId, runCartMutation, commitCart],
  );

  const applyBetterCouponHandler = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      try {
        const success = await applyPromoCodeHandler(code);
        return {
          success,
          message: success
            ? "Coupon applied!"
            : "This code is unavailable for your cart.",
        };
      } catch (error: unknown) {
        return {
          success: false,
          message: getProviderErrorMessage(error) || "Failed",
        };
      }
    },
    [applyPromoCodeHandler],
  );

  const createAndSelectStripePaymentSessionHandler = useCallback(
    async (cartId: string): Promise<StoreCart> => {
      const targetCartId = cart?.id;
      if (!targetCartId || targetCartId !== cartId) {
        throw new Error("Cart not found");
      }
      const generation = sessionGeneration.current;
      return runCartMutation(async () => {
        const updatedCart =
          await createAndSelectStripePaymentSession(targetCartId);
        commitCart(updatedCart, generation);
        return updatedCart;
      });
    },
    [cart?.id, runCartMutation, commitCart],
  );

  const applySavedCoupons = useCallback(
    async (codes: unknown) => {
      if (!cart?.id) return;
      const generation = sessionGeneration.current;
      const assertActive = () => {
        if (generation !== sessionGeneration.current)
          throw new Error("Your account changed. Please try again.");
      };
      await runCartMutation(async () => {
        try {
          const updatedCart = await applyBestCoupon(cart, codes, {
            apply: (code) => {
              assertActive();
              return applyPromoCode(cart.id, code);
            },
            remove: (code) => {
              assertActive();
              return removePromoCode(cart.id, code);
            },
          });
          commitCart(updatedCart, generation);
        } catch (error) {
          if (generation === sessionGeneration.current) await refreshCart();
          throw error;
        }
      });
    },
    [cart, runCartMutation, commitCart, refreshCart],
  );

  // Switch currency by switching region. A live cart moves with the visitor:
  // the backend may drop lines the new region cannot sell, which surfaces as a
  // notice. A failed move keeps the original region, cart and cookie intact.
  const selectRegion = useCallback(
    async (regionId: string) => {
      if (!isValidRegionId(regionId)) return;
      const target = regions.find((entry) => entry.id === regionId);
      if (!target || target.id === region?.id) return;
      const generation = sessionGeneration.current;
      setRegionSwitching(true);
      try {
        await runCartMutation(async () => {
          const active = cartRef.current;
          let removedNotice: string | null = null;
          if (active && !active.completed_at) {
            const before = active.items?.length ?? 0;
            const updated = await updateCartRegion(active.id, regionId);
            if (generation !== sessionGeneration.current) return;
            setCart(updated);
            if ((updated.items?.length ?? 0) < before) {
              removedNotice = "Some items are not available in this region and were removed.";
            }
          }
          writeRegionCookie(regionId);
          setRegion(target);
          setRegionNotice(removedNotice);
          // Server components re-render prices for the new region cookie.
          router.refresh();
        });
      } catch {
        if (generation === sessionGeneration.current) {
          setRegionNotice("This currency could not be selected. Please try again.");
        }
      } finally {
        setRegionSwitching(false);
      }
    },
    [regions, region?.id, runCartMutation, setCart, router],
  );

  const clearRegionNotice = useCallback(() => setRegionNotice(null), []);

  const cartCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <RegionContext.Provider
      value={{
        region,
        regionLoading,
        regions,
        regionSwitching,
        regionNotice,
        clearRegionNotice,
        selectRegion,
      }}
    >
      <StoreStatusContext.Provider
        value={{ ordersOpen, storeStatusLoading, newsletterEnabled }}
      >
        <AuthContext.Provider
          value={{
            user,
            loading: authLoading,
            login: handleLogin,
            register: handleRegister,
            logout: handleLogout,
            saveCustomerMetadata,
          }}
        >
          <WishlistProvider>
            <CartContext.Provider
              value={{
                cart,
                cartLoading,
                cartError,
                cartCount,
                addItem,
                updateItem,
                removeItem,
                refreshCart,
                ensureCart,
                applyPromoCode: applyPromoCodeHandler,
                removePromoCode: removePromoCodeHandler,
                applyBetterCoupon: applyBetterCouponHandler,
                applySavedCoupons,
                createAndSelectStripePaymentSession:
                  createAndSelectStripePaymentSessionHandler,
              }}
            >
              {children}
            </CartContext.Provider>
          </WishlistProvider>
        </AuthContext.Provider>
      </StoreStatusContext.Provider>
    </RegionContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
}

export function useStoreStatus() {
  const context = useContext(StoreStatusContext);
  // Composing this hook outside the provider (e.g. isolated card renders) must
  // fail closed: orders stay closed rather than defaulting open.
  if (context === undefined) {
    return { ordersOpen: false, storeStatusLoading: false, newsletterEnabled: false };
  }
  return context;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
