# Cansoria Studio Backend Project Notes

This backend remains a Medusa v2 application. It has been adapted for the Cansoria Studio oil painting storefront.

## Project Scope

- Brand: Cansoria Studio
- Storefront: custom oil paintings, portraits, pet portraits, wedding gifts, landscape art, abstract wall art, classic art reproductions, and home decor canvas paintings
- Backend port: `9030`
- Frontend port: `3030`
- Admin URL: `http://localhost:9030/app`

## Core Modules

- Medusa Store, Product, Pricing, Cart, Order, Customer, Promotion, Fulfillment, Inventory, Sales Channel, API Key, Auth, File, Notification, and Payment modules
- Stripe payment provider with provider ID `pp_stripe_stripe`
- Resend notification provider
- Klaviyo newsletter helper
- S3-compatible file provider for R2 or another storage service

## Seed Data

The main seed script creates:

- `Cansoria Studio` store metadata
- `Cansoria Studio Storefront` sales channel
- GBP, USD, and EUR regions
- Artwork shipping profile, service zone, and shipping options
- Product categories:
  - `custom-portraits`
  - `custom-painting`
  - `pet-portraits`
  - `wedding-gifts`
  - `landscape`
  - `abstract`
  - `classic-art`
  - `home-decor`
  - `wall-art`
- Products:
  - Custom Portrait From Photo
  - Pet Portrait Oil Painting
  - Wedding Anniversary Oil Portrait
  - Landscape Oil Painting
  - Abstract Canvas Wall Art
  - Classic Art Reproduction
  - Home Decor Canvas Painting

Each product uses Size, Framing, and Orientation variants. Product metadata supports storefront content such as `customizable`, `free_preview`, `rating`, `review_count`, `production_time`, and `story_sections`.

## Environment Template

Use `.env.template` as the source for required local variables. Keep real values only in `.env` or deployment secrets.

Important local defaults:

```bash
STORE_CORS=http://localhost:3030
ADMIN_CORS=http://localhost:9030,http://localhost:7001
AUTH_CORS=http://localhost:3030,http://localhost:9030,http://localhost:7001
MEDUSA_BACKEND_URL=http://localhost:9030
STOREFRONT_URL=http://localhost:3030
FRONTEND_URL=http://localhost:3030
DATABASE_URL=postgres://cansoria:cansoria@localhost:5433/cansoria_medusa_v2
REDIS_URL=redis://localhost:6480
DB_NAME=cansoria_medusa_v2
```

## Storefront Contract

The Next.js storefront depends on:

- `GET /store/store-info`
- `GET /store/regions`
- `GET /store/products`
- `GET /store/products?handle=:handle`
- `GET /store/product-categories`
- `POST /store/carts`
- `GET /store/carts/:id`
- `POST /store/carts/:id/line-items`
- `POST /store/carts/:id/promotions`
- `DELETE /store/carts/:id/promotions`
- `POST /store/carts/:id/customer`
- `GET /store/shipping-options?cart_id=:cartId`
- `POST /store/carts/:id/shipping-methods`
- `POST /store/payment-collections`
- `POST /store/payment-collections/:id/payment-sessions`
- `POST /store/carts/:id/complete`
- Customer auth, profile, address, and order endpoints
- `POST /store/newsletter`

## Newsletter and Coupon Flow

Newsletter signup verifies Turnstile, creates an `ART15-` promotion where possible, syncs to Klaviyo when configured, and returns the generated code to the storefront.

## Production Confirmation Items

Before launch, confirm:

- Production storefront domain
- Admin domain
- Stripe secret and publishable keys
- Stripe webhook strategy
- Resend sender and reply-to email
- Klaviyo private key and list ID
- R2 or S3-compatible bucket, endpoint, and public file URL
- Turnstile site and secret keys
- Whether custom artwork upload is handled by order metadata first or by a dedicated upload route
