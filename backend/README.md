# Cansoria Studio Backend

Medusa v2 backend for the Cansoria Studio watch storefront.

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
- Shipping profiles and options for watch delivery
- Men's, women's, automatic, chronograph, dress, dive, everyday, and gift watch categories
- Eight demo watch models with Size, Strap, and Dial variants
- Demo metadata including `engraveable`, `movement`, `water_resistance`, `warranty`, `rating`, `review_count`, and `story_sections`; public field exposure and model-specific specifications still require the changes described in the current audit

Run the seed script only against an empty development database or an isolated test database. It is not a migration from the previous catalog and is not guaranteed to be repeatable; it creates products and inventory levels. Back up existing business data and prepare a scoped migration before changing an existing store.

```powershell
npm.cmd run seed
```

## Tests

The npm scripts use `cross-env`, so they work in PowerShell:

```powershell
npm.cmd run test:unit
```

## Frontend Contract

The Cansoria storefront uses products, categories, carts, engraving, shipping options, payment collections, customer accounts, secure order lookup, and newsletter subscription. Maintain the shared integration contract in [docs/FRONTEND_CART_API.md](docs/FRONTEND_CART_API.md); access and deployment requirements are in [SECURITY.md](SECURITY.md).

## LORENCESS dev seed

`src/scripts/lorencess-dev-seed.ts` creates the minimal local data the
LORENCESS storefront expects (admin user, USD/EUR regions, `bags-all`
category, published `test-bag` product, stock, `orders_open`). It is
idempotent and refuses to run when `NODE_ENV=production`.

The admin credentials are read from the environment and never logged:

```bash
# .env
LORENCESS_SEED_ADMIN_EMAIL=you@example.dev
LORENCESS_SEED_ADMIN_PASSWORD=choose-at-least-12-characters

# with npm run dev already listening on 9030
NODE_ENV=development npx medusa exec ./src/scripts/lorencess-dev-seed.ts
```
