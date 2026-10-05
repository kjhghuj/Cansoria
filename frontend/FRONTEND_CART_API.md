# Cansoria Frontend Cart and Checkout Guide

This document describes the Store API contract used by the Cansoria Studio Next.js storefront.

## Environment

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9030
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

Do not commit real Stripe, Medusa, Turnstile, Resend, Klaviyo, or storage credentials.

## Cart

Base URL: `http://localhost:9030/store`

- `POST /carts`
- `GET /carts/:id`
- `POST /carts/:id/line-items`
- `POST /carts/:id/line-items/:line_id`
- `DELETE /carts/:id/line-items/:line_id`
- `POST /carts/:id/promotions`
- `DELETE /carts/:id/promotions`
- `POST /carts/:id/customer`

The cart response must include items, variant product data, promotions, totals, region, shipping methods, and payment collection fields.

## Shipping

- `GET /shipping-options?cart_id=:cartId`
- `POST /carts/:id/shipping-methods`

## Stripe Payment

Use the Next.js bridge route:

`POST /api/checkout/:cartId/payment-sessions`

The bridge uses Medusa v2 payment collections:

1. `GET /store/carts/:cartId?fields=+payment_collection.payment_sessions`
2. `POST /store/payment-collections`
3. `POST /store/payment-collections/:id/payment-sessions`

Stripe provider ID:

```json
{
  "provider_id": "pp_stripe_stripe"
}
```

The bridge returns `client_secret`, which the checkout page passes to Stripe Elements.

Complete the order after payment confirmation:

`POST /store/carts/:id/complete`

## Newsletter

`POST /store/newsletter`

```json
{
  "email": "customer@example.com",
  "turnstile_token": "token"
}
```

When promotion creation succeeds, the response includes an `ART15-` welcome code.
