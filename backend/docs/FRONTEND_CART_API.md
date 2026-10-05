# Cansoria Frontend Cart and Checkout Guide

This guide documents the Store API contract used by the Cansoria Studio Next.js storefront.

## Environment

```bash
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9030
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_KEY=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

## Cart Endpoints

Base URL: `http://localhost:9030/store`

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

## Newsletter

`POST /store/newsletter`

```json
{
  "email": "customer@example.com",
  "turnstile_token": "token"
}
```

Successful responses can include:

```json
{
  "message": "Successfully subscribed. Your Cansoria welcome code is ready.",
  "discount_code": "ART15-ABCD12",
  "valid_until": "2026-07-04T00:00:00.000Z",
  "promotion_created": true,
  "klaviyo_subscribed": true
}
```
