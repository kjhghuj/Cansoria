const KEY = 'cansoria_order_confirmation';
export interface OrderConfirmation {
  orderId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function saveOrderConfirmation(data: OrderConfirmation): void {
  sessionStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
}

// Display-only state; access to an order still requires backend authorization.
export function readOrderConfirmation(): OrderConfirmation | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!value || typeof value.orderId !== 'string' || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > 30 * 60_000 || !['email', 'firstName', 'lastName'].every((key) => typeof value[key] === 'string')) return null;
    return value;
  } catch { return null; }
}
