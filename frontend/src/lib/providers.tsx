"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  createCart,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  getRegion,
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

const CART_ID_KEY = "cansoria_cart_id";
const AUTH_TOKEN_KEY = "medusa_auth_token";

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
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

interface CartContextType {
  cart: StoreCart | null;
  cartLoading: boolean;
  cartCount: number;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: (code: string) => Promise<boolean>;
  applyBetterCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  createAndSelectStripePaymentSession: (cartId: string) => Promise<StoreCart>;
}

interface RegionContextType {
  region: StoreRegion | null;
  regionLoading: boolean;
}

// Contexts
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CartContext = createContext<CartContextType | undefined>(undefined);
const RegionContext = createContext<RegionContextType | undefined>(undefined);

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
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);

  // Region State
  const [region, setRegion] = useState<StoreRegion | null>(null);
  const [regionLoading, setRegionLoading] = useState(true);

  // Initialize Region
  useEffect(() => {
    async function initRegion() {
      try {
        const fetchedRegion = await getRegion("gb");
        setRegion(fetchedRegion);
      } catch {

      } finally {
        setRegionLoading(false);
      }
    }
    initRegion();
  }, []);

  // Initialize Auth
  useEffect(() => {
    async function initAuth() {
      // Remove credentials persisted by older storefront releases.
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      try {
        const customer = await getCustomer();
        if (customer) setUser(customer as unknown as User);
      } finally {
        setAuthLoading(false);
      }
    }
    initAuth();
  }, []);

  // Initialize Cart (Dependent on Region and Auth)
  useEffect(() => {
    async function initCart() {
      if (authLoading || regionLoading) return;
      if (!region) {
        setCart(null);
        setCartLoading(false);
        return;
      }

      try {
        setCartLoading(true);
        const cartIdToFetch = localStorage.getItem(CART_ID_KEY);
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

            if (savedCart && !savedCart.completed_at) {
              currentCart = savedCart;
              localStorage.setItem(CART_ID_KEY, savedCart.id);
            }
          }

          // If we still don't have a cart, but have a local one, try to claim it
          if (!currentCart && cartIdToFetch) {
            const localCart = await getCart(cartIdToFetch);
            if (localCart && !localCart.completed_at) {
              // Assign to user
              await updateCartOwnership(localCart.id);
              // Save to metadata
              await updateCustomerMetadata({ ...user.metadata, active_cart_id: localCart.id });
              currentCart = localCart;
            }
          }
        }

        // 4. If still no currentCart (Guest or User with no carts), try generic local storage fetch (Guest)
        if (!currentCart && cartIdToFetch) {
          const localCart = await getCart(cartIdToFetch);
          if (localCart && !localCart.completed_at) {
            currentCart = localCart;
            // If user logged in (and flow reached here), ensure it's owned and saved
            if (user) {
              await updateCartOwnership(localCart.id);
              await updateCustomerMetadata({ ...user.metadata, active_cart_id: localCart.id });
            }
          } else {
            localStorage.removeItem(CART_ID_KEY);
          }
        }

        // 5. Final fallback: Create new cart
        if (!currentCart) {
          const newCart = await createCart(region.id);
          if (newCart) {
            currentCart = newCart;
            localStorage.setItem(CART_ID_KEY, newCart.id);

            if (user) {
              await updateCartOwnership(newCart.id);
              await updateCustomerMetadata({ ...user.metadata, active_cart_id: newCart.id });
            }
          }
        }

        if (currentCart) {
          setCart(currentCart);
        }

      } catch {

      } finally {
        setCartLoading(false);
      }
    }

    initCart();
  }, [region, regionLoading, authLoading, user]); // Re-run when user changes (login/logout)

  // Auth Handlers
  const handleLogin = async (email: string, pass: string) => {
    // Don't set global auth loading to prevent unmounting the login form
    // setAuthLoading(true);
    try {
      await login(email, pass);
      const customer = await getCustomer();
      if (!customer) throw new Error("Unable to load your account.");
      setUser(customer as unknown as User);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (email: string, pass: string, first: string, last: string) => {
    // Don't set global auth loading to prevent unmounting the register form
    // setAuthLoading(true);
    try {
      const result = await register(email, pass, first, last);
      setUser(result.customer as unknown as User);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CART_ID_KEY); // Clear local cart reference on logout to avoid mixing
    setUser(null);
    setCart(null);
    // Effect will trigger, create a new Guest cart
  };

  // Cart Handlers (Wrapped to ensure check)
  const refreshCart = useCallback(async () => {
    if (!cart?.id) return;
    try {
      const updatedCart = await getCart(cart.id);

      // If cart is completed OR if getCart returned null (invalid/not found), reset.
      if (!updatedCart || updatedCart.completed_at) {

        localStorage.removeItem(CART_ID_KEY);
        setCart(null);

        // Create a new fresh cart immediately
        if (region) {
          const newCart = await createCart(region.id);
          if (newCart) {
            setCart(newCart);
            localStorage.setItem(CART_ID_KEY, newCart.id);

            // Sync with user if logged in (persist new cart ID)
            if (user) {
              await updateCartOwnership(newCart.id);
              await updateCustomerMetadata({ ...user.metadata, active_cart_id: newCart.id });
            }
          }
        }
      } else {
        // Valid active cart
        setCart(updatedCart);
      }
    } catch {

    }
  }, [cart?.id, region, user]);

  const addItem = useCallback(
    async (variantId: string, quantity: number = 1) => {
      if (!cart?.id) return;
      setCartLoading(true);
      try {
        const updatedCart = await addToCart(cart.id, variantId, quantity);
        if (updatedCart) setCart(updatedCart);
      } catch (error: unknown) {
        // If "Cart is already completed", refresh to reset it
        if (isCompletedOrInvalidCartError(error)) {
          await refreshCart();
        }

      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id, refreshCart]
  );

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart?.id) return;
      setCartLoading(true);
      try {
        const updatedCart = await updateCartItem(cart.id, lineItemId, quantity);
        if (updatedCart) setCart(updatedCart);
      } catch (error: unknown) {
        if (isCompletedOrInvalidCartError(error)) {
          await refreshCart();
        }

      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id, refreshCart]
  );

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart?.id) return;
      setCartLoading(true);
      try {
        const updatedCart = await removeFromCart(cart.id, lineItemId);
        if (updatedCart) setCart(updatedCart);
      } catch (error: unknown) {
        if (isCompletedOrInvalidCartError(error)) {
          await refreshCart();
        }

      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id, refreshCart]
  );

  const applyPromoCodeHandler = useCallback(
    async (code: string): Promise<boolean> => {
      if (!cart?.id) return false;
      setCartLoading(true);
      try {
        const updatedCart = await applyPromoCode(cart.id as string, code);
        if (updatedCart) {
          setCart(updatedCart);
          return true;
        }
        return false;
      } catch (error) {

        throw error;
      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id]
  );

  const removePromoCodeHandler = useCallback(
    async (code: string): Promise<boolean> => {
      if (!cart?.id) return false; setCartLoading(true);
      try {
        const updatedCart = await removePromoCode(cart.id, code);
        if (updatedCart) {
          setCart(updatedCart);
          return true;
        }
        return false;
      } catch (error) {

        throw error;
      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id]
  );

  const applyBetterCouponHandler = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!cart?.id) return { success: false, message: "Cart not found" }; setCartLoading(true);
      try {
        const updatedCart = await applyPromoCode(cart.id, code);
        if (!updatedCart) return { success: false, message: "Invalid promo code" };        // Simple check: if we got a cart back, assume success for now or check promotions array
        setCart(updatedCart);
        return { success: true, message: "Coupon applied!" };
      } catch (error: unknown) {
        return { success: false, message: getProviderErrorMessage(error) || "Failed" };
      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id]
  );

  const createAndSelectStripePaymentSessionHandler = useCallback(
    async (cartId: string): Promise<StoreCart> => {
      const targetCartId = cart?.id || cartId;
      if (!targetCartId) {
        throw new Error("Cart not found");
      }
      setCartLoading(true);
      try {
        const updatedCart = await createAndSelectStripePaymentSession(targetCartId);
        if (updatedCart) setCart(updatedCart);
        return updatedCart;
      } catch (error) {

        throw error;
      } finally {
        setCartLoading(false);
      }
    },
    [cart?.id]
  );

  const cartCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <RegionContext.Provider value={{ region, regionLoading }}>
      <AuthContext.Provider value={{ user, loading: authLoading, login: handleLogin, register: handleRegister, logout: handleLogout }}>
        <CartContext.Provider
          value={{
            cart,
            cartLoading,
            cartCount,
            addItem,
            updateItem,
            removeItem,
            refreshCart,
            applyPromoCode: applyPromoCodeHandler,
            removePromoCode: removePromoCodeHandler,
            applyBetterCoupon: applyBetterCouponHandler,
            createAndSelectStripePaymentSession: createAndSelectStripePaymentSessionHandler,
          }}
        >
          {children}
        </CartContext.Provider>
      </AuthContext.Provider>
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}
