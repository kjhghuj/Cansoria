import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export const ORDERS_CLOSED_MESSAGE =
  "Orders are not open yet. Please contact the studio to be notified when orders open."

type StoreLike = { listStores: (...args: unknown[]) => Promise<{ metadata?: Record<string, unknown> | null }[]> }

/**
 * Orders stay closed until the store record explicitly opts in. Missing metadata,
 * a missing store, or any non-true value fails closed: preparation is the default
 * state, and opening orders is a business decision made in the admin store settings.
 */
export function storeOrdersOpen(metadata: Record<string, unknown> | null | undefined): boolean {
  return (metadata as { orders_open?: unknown } | null | undefined)?.orders_open === true
}

export async function storeOrdersOpenForScope(container: MedusaContainer): Promise<boolean> {
  const stores = container.resolve<StoreLike>(Modules.STORE)
  const store = (await stores.listStores())?.[0]
  return storeOrdersOpen(store?.metadata)
}
