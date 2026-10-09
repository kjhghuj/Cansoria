import type { StoreCart } from "./types";

export interface DeliveryDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  amount?: number | null;
  insufficient_inventory?: boolean;
}

export function deliveryDetailsKey(cartId: string, details: DeliveryDetails) {
  return JSON.stringify(
    [
      cartId,
      details.name,
      details.phone,
      details.email,
      details.address,
      details.city,
      details.postalCode,
      details.country,
    ].map((value) => value.trim()),
  );
}

export async function prepareDelivery(
  cartId: string,
  details: DeliveryDetails,
) {
  const [firstName, ...lastName] = details.name.trim().split(/\s+/);
  const address = {
    first_name: firstName,
    last_name: lastName.join(" "),
    phone: details.phone.trim(),
    address_1: details.address.trim(),
    city: details.city.trim(),
    country_code: details.country.toLowerCase(),
    postal_code: details.postalCode.trim(),
  };
  const update = await fetch(
    `/api/medusa/store/carts/${encodeURIComponent(cartId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: details.email.trim(),
        shipping_address: address,
        billing_address: address,
      }),
    },
  );
  if (!update.ok)
    throw new Error(
      "Unable to save your address. Please check your details and try again.",
    );
  const response = await fetch(
    `/api/medusa/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
  );
  if (!response.ok)
    throw new Error("Unable to load delivery options. Please try again.");
  const data = (await response.json()) as {
    shipping_options?: DeliveryOption[];
  };
  return (
    data.shipping_options?.filter((option) => !option.insufficient_inventory) ??
    []
  );
}

export async function confirmDelivery(
  cartId: string,
  optionId: string,
  availableOptions: DeliveryOption[],
) {
  if (!availableOptions.some((option) => option.id === optionId))
    throw new Error("Please select an available delivery method.");
  const response = await fetch(
    `/api/medusa/store/carts/${encodeURIComponent(cartId)}/shipping-methods`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option_id: optionId }),
    },
  );
  if (!response.ok)
    throw new Error(
      "Unable to confirm delivery. Please try again before paying.",
    );
}

export function paymentTotalsMatch(reviewed: StoreCart, current: StoreCart) {
  const addressKey = (cart: StoreCart) =>
    JSON.stringify([
      cart.email,
      ...[cart.shipping_address, cart.billing_address].map(
        (address) =>
          address && [
            address.first_name,
            address.last_name,
            address.phone,
            address.address_1,
            address.address_2,
            address.city,
            address.country_code,
            address.postal_code,
            address.province,
          ],
      ),
    ]);
  const itemsKey = (cart: StoreCart) =>
    JSON.stringify(
      cart.items
        ?.map((item) => [item.id, item.quantity, item.total])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
  return (
    reviewed.id === current.id &&
    !current.completed_at &&
    typeof current.total === "number" &&
    Number.isFinite(current.total) &&
    reviewed.total === current.total &&
    reviewed.currency_code === current.currency_code &&
    reviewed.shipping_methods?.[0]?.shipping_option_id ===
      current.shipping_methods?.[0]?.shipping_option_id &&
    itemsKey(reviewed) === itemsKey(current) &&
    addressKey(reviewed) === addressKey(current)
  );
}

export function hasAuthorizedStripePayment(cart: StoreCart | null) {
  return (
    cart?.payment_collection?.payment_sessions?.some(
      (session) =>
        session.provider_id === "pp_stripe_stripe" &&
        session.status === "authorized",
    ) ?? false
  );
}
