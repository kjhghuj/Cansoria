# Cansoria Frontend

Cansoria Studio watch storefront, built with Next.js and connected to the Cansoria Medusa backend.

## Local development

Run these commands from the frontend directory:

```powershell
npm ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Configure `.env.local` for your environment and start the backend before using store features.
The development server runs at http://localhost:3030.
Keep real credentials in local environment files.

## Commands

- `npm run dev`: start the development server.
- `npm run lint`: run ESLint.
- `npm run build`: create the production build.
- `npm run start`: serve the production build.

## Source directories

- `src/app`: pages, layouts, and application routes.
- `src/components`: storefront components.
- `src/lib`: API clients and shared utilities.
- `public`: public static assets.

The backend source and its documentation are in `../backend`.

The shared cart and checkout contract is maintained in [backend/docs/FRONTEND_CART_API.md](../backend/docs/FRONTEND_CART_API.md). Current redesign work is tracked in the [watch store audit and plan](../WATCH_STORE_CODE_AUDIT_AND_REDESIGN_PLAN_2026-10-21.md).

## Listing products from the Medusa Admin

Products managed in the Medusa Admin appear on the storefront next to the
imported reference catalogue:

- A product's **handle is its URL**: a product with handle `test-bag` is served
  at `/test-bag`. Choose handles that do not collide with existing pages.
- A **category handle must match the navigation** (`bags-all`, `shoes`,
  `clothing`, …) for its products to appear on that category page; products of a
  same-handle category are listed before the imported catalogue items.
- Set the brand shown on cards and detail pages with the product's
  **`metadata.brand`** field.
- Products need prices for the store's regions, and managed variants need stock
  at a stock location linked to the sales channel; variants without stock are
  shown as sold out and cannot be added to the cart.
