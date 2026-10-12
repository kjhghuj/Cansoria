import type { MedusaRequest } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/** The Medusa schema has unique(email,has_account); match guest records without ever matching a registered account. */
export async function guestCustomer(req: MedusaRequest, email: unknown): Promise<string | undefined> {
  return guestCustomerForContainer(req.scope, email)
}

export async function guestCustomerForContainer(container: MedusaContainer, email: unknown): Promise<string | undefined> {
  if (typeof email !== "string" || !email.trim()) return undefined
  const normalized = email.trim().toLowerCase()
  const customers = container.resolve(Modules.CUSTOMER)
  const matching = await customers.listCustomers({ email: normalized, has_account: false })
  const customer = matching[0] || await customers.createCustomers({ email: normalized, has_account: false })
  if (customer.has_account !== false) throw new Error("Guest identity required")
  return customer.id
}
