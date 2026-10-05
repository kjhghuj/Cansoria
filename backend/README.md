# Cansoria Studio Backend

Medusa v2 backend for the Cansoria Studio oil painting storefront.

## Stack

- Medusa v2
- Node.js 20+
- PostgreSQL
- Redis
- Stripe payment provider
- Resend notification provider
- Klaviyo newsletter sync
- Cloudflare R2 or another S3-compatible file provider

## Local Ports

- Backend: `http://localhost:9030`
- Storefront: `http://localhost:3030`
- Medusa Admin: `http://localhost:9030/app`

## Setup

```powershell
npm.cmd install
docker compose up -d postgres redis
Copy-Item .env.template .env
npm.cmd run dev
```

The template uses the local Docker PostgreSQL and Redis defaults:

- `DATABASE_URL=postgres://cansoria:cansoria@localhost:5433/cansoria_medusa_v2`
- `REDIS_URL=redis://localhost:6480`

Fill `.env` with payment, email, newsletter, or file-upload credentials before running those flows. Do not commit real secrets.

## Seed Data

The seed script creates Cansoria Studio data:

- Store name and storefront sales channel
- GBP, USD, and EUR regions
- Stripe payment provider IDs using `pp_stripe_stripe`
- Shipping profiles and options for artwork delivery
- Product categories for custom portraits, pet portraits, wedding gifts, landscape, abstract, classic art, home decor, and wall art
- Oil painting products with Size, Framing, and Orientation variants
- Product metadata used by the Next.js storefront, including `customizable`, `free_preview`, `rating`, `review_count`, `production_time`, and `story_sections`

Run the seed script after configuring the database:

```powershell
npm.cmd run seed
```

## Tests

The npm scripts use `cross-env`, so they work in PowerShell:

```powershell
npm.cmd run test:unit
```

## Frontend Contract

The Cansoria storefront expects the Store API to expose products, categories, carts, shipping options, payment collection/session flow, customer account endpoints, order lookup, and newsletter subscription. See `STORE_API_DOCS.md` and `docs/FRONTEND_CART_API.md`.
