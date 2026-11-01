"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

type MiniCartState = {
  open: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
};

const MiniCartContext = createContext<MiniCartState | null>(null);

/**
 * Shared open/close state for the mini cart so any add-to-cart action can pop
 * the panel open (see ProductBuy) while the header owns the toggle button.
 * Rendering outside the provider is legal: useMiniCart degrades to no-ops so
 * old pages that never show the panel keep working.
 */
export function MiniCartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openMiniCart = useCallback(() => setOpen(true), []);
  const closeMiniCart = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ open, openMiniCart, closeMiniCart }),
    [open, openMiniCart, closeMiniCart],
  );
  return <MiniCartContext.Provider value={value}>{children}</MiniCartContext.Provider>;
}

export function useMiniCart(): MiniCartState {
  return (
    useContext(MiniCartContext) ?? {
      open: false,
      openMiniCart: () => {},
      closeMiniCart: () => {},
    }
  );
}
