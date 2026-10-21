# Cansoria Frontend Cart and Checkout Guide

This is the shared cart and checkout contract for the Cansoria Studio watch storefront. It replaces the duplicate frontend guide. Access and deployment requirements are maintained in [../SECURITY.md](../SECURITY.md).

## Environment

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9030
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

## Cart Endpoints

Base URL: `http://localhost:9030/store`

Browser requests use the same-origin Next.js `/api/medusa/store/...` proxy. The server forwards the configured publishable key and authorized customer/cart/order capabilities through HttpOnly cookies. A publishable key alone does not authorize access to a cart or order. Do not put session tokens or signed capabilities in localStorage.

### Create Cart

`POST /carts`

```json
{
  "region_id": "reg_01...",
  "sales_channel_id": "sc_01..."
}
```

### Get Cart

`GET /carts/:id`

The frontend needs these fields:

- `cart.id`
- `cart.email`
- `cart.currency_code`
- `cart.region`
- `cart.items`
- `cart.items[].variant`
- `cart.items[].variant.product`
- `cart.promotions`
- `cart.shipping_methods`
- `cart.payment_collection`
- `cart.total`, `cart.subtotal`, `cart.discount_total`, `cart.shipping_total`, `cart.tax_total`

### Add Line Item

`POST /carts/:id/line-items`

```json
{
  "variant_id": "variant_01...",
  "quantity": 1
}
```

### Apply Promotion

Welcome codes are account-bound and validated by the server. Apply them after cart creation. Legacy ART15 compatibility checks must remain intact until existing promotions are migrated separately.

`POST /carts/:id/promotions`

```json
{
  "promo_codes": ["ART15-ABCD12"]
}
```

### Remove Promotion

`DELETE /carts/:id/promotions`

```json
{
  "promo_codes": ["ART15-ABCD12"]
}
```

### Attach Customer

`POST /carts/:id/customer`

Requires a customer bearer token.

The current customer must also be authorized to claim the cart; matching an email alone does not establish ownership.

### Add an Engraved Watch

`POST /carts/:cartId/engraving-items`

```json
{
  "variant_id": "variant_example",
  "quantity": 1,
  "text": "J & M 2026",
  "font": "serif",
  "notes": "Centre the initials."
}
```

- Quantity: 1–10.
- Text: 1–20 supported Latin letters, digits, spaces, and punctuation as defined in `src/lib/engraving.ts`.
- Font: `script`, `serif`, or `sans`.
- Notes: optional, up to 1000 characters.
- The backend verifies product eligibility and cart authorization, then attaches cart-bound engraving metadata. Payment and order completion validate it again.
- Notes-only behavior, duplicated engraving eligibility rules, and admin/email presentation gaps remain tracked in the [current watch audit](../../WATCH_STORE_CODE_AUDIT_AND_REDESIGN_PLAN_2026-10-21.md); this guide does not claim those changes are implemented.

## Shipping

### List Shipping Options

`GET /shipping-options?cart_id=:cartId`

### Add Shipping Method

`POST /carts/:id/shipping-methods`

```json
{
  "option_id": "so_01..."
}
```

## Stripe Payment Flow

Medusa v2 uses payment collections.

Save the address, select delivery, refresh the cart, and review the authoritative total before payment. Address changes invalidate the previous delivery confirmation. Product and cart amounts use major currency units; do not divide them by 100 for display.

The frontend should use the Next.js bridge:

`POST /api/checkout/:cartId/payment-sessions`

The bridge performs:

1. `GET /store/carts/:cartId?fields=+payment_collection.payment_sessions`
2. `POST /store/payment-collections` when the cart has no payment collection
3. `POST /store/payment-collections/:id/payment-sessions` with `provider_id: "pp_stripe_stripe"`

Bridge response:

```json
{
  "cart": {},
  "payment_session": {
    "provider_id": "pp_stripe_stripe",
    "data": {
      "client_secret": "pi_..."
    }
  },
  "client_secret": "pi_..."
}
```

Complete the cart after Stripe confirmation:

`POST /store/carts/:id/complete`

The backend completion result confirms the order. The proxy stores a read-only capability for confirmation-page recovery; it is not an order-claim credential. Do not resubmit payment merely to recover an order confirmation.

Orders remain closed unless the store metadata explicitly sets `orders_open` to `true`. The backend permits only `pp_stripe_stripe`; a frontend development-provider setting does not make the backend support mock checkout. Already-paid Stripe sessions retain a completion recovery path when the store closes.

## Newsletter

`POST /store/newsletter`

```json
{
  "email": "customer@example.com",
  "turnstile_token": "token"
}
```

Anonymous subscriptions never create a promotion. An authenticated eligible customer subscribing with their account email may receive their existing welcome code. List consent and real delivery require configured services and separate integration validation.

An anonymous subscription response is:

```json
{
  "message": "Please check your email to confirm your subscription.",
  "klaviyo_subscribed": true
}
```
