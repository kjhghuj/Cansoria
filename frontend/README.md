# Cansoria Frontend

Cansoria Studio oil painting storefront, built with Next.js and connected to the Cansoria Medusa backend.

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
