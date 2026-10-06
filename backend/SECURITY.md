# Security Guidelines

## Overview

This document outlines security requirements for the Cansoria Studio Medusa backend.

## Environment Variables

Never commit real credentials. Configure secrets through environment variables or the deployment platform.

Required production variables:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | JWT signing secret |
| `COOKIE_SECRET` | Cookie signing secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `STORE_CORS` | Allowed storefront origins |
| `ADMIN_CORS` | Allowed admin origins |
| `AUTH_CORS` | Allowed auth origins |
| `STOREFRONT_URL` (or `FRONTEND_URL`) | Valid HTTPS storefront origin without URL credentials; validated at production startup |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Verified sender email |
| `RESEND_REPLY_TO` | Customer reply-to email |
| `STRIPE_API_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for frontend |
| `STRIPE_WEBHOOK_SECRET` | Stripe endpoint signing secret (`whsec_...`) |
| `KLAVIYO_PRIVATE_KEY` | Klaviyo private key |
| `KLAVIYO_LIST_ID` | Klaviyo newsletter list ID |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `TURNSTILE_HOSTNAMES` | Exact allowed Turnstile hostnames |
| `TURNSTILE_ACTION` | Challenge action; default `newsletter` |
| `S3_FILE_URL` | Public file base URL |
| `S3_ACCESS_KEY_ID` | S3-compatible access key |
| `S3_SECRET_ACCESS_KEY` | S3-compatible secret key |
| `S3_BUCKET` | Asset bucket |
| `S3_ENDPOINT` | S3-compatible endpoint |

## Secret Generation

Generate secure secrets with PowerShell and Node:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Production rejects secrets shorter than 32 characters and known placeholder values. Use independent random JWT and cookie secrets.

## Production Checklist

- [ ] Set secure `JWT_SECRET` and `COOKIE_SECRET`
- [ ] Set production `DATABASE_URL` and `REDIS_URL`
- [ ] Restrict CORS to the real storefront and admin domains
- [ ] Use verified Resend sender and reply-to emails
- [ ] Use live Stripe keys only in production secret storage
- [ ] Configure Stripe webhooks if the production flow depends on webhook events
- [ ] Configure Klaviyo list and consent settings
- [ ] Configure Turnstile secret and frontend site key
- [ ] Configure R2 or S3-compatible storage with least-privilege keys
- [ ] Verify `.env` is ignored by version control
- [ ] Run dependency audit before launch

## API Safety

- Validate emails, cart IDs, product IDs, and request bodies.
- Do not expose stack traces to Store API consumers.
- Log operational events without secrets, card data, or private customer notes.
- Redis provides shared atomic rate limits for newsletter, account creation/authentication, checkout, payments and order access. Production does not fall back to process memory; Redis errors return 503. Per-IP limits return 429 with Retry-After. Order-access and welcome-registration emails also have a shared daily ceiling of 500 requests.

## Identity and Storage Boundaries

Guest carts require the signed `x-cart-access-token`; registered customer carts require the matching authenticated customer. Medusa's guest customer records (`has_account=false`) remain guest resources. An email match never attaches a guest cart to a registered account; only authenticated cart claim can do that. The frontend must keep capabilities and customer sessions in HttpOnly cookies and forward them through its controlled BFF.

Guest order details require a 15-minute mailbox access link. `/store/orders/access` responds uniformly with 202 and emails the link only for matching details. Order claim requires both a signed link and customer authentication, is serialized with cart/order identity locks, and copies no addresses. Core transfer request/accept/decline/cancel routes are disabled.

Anonymous newsletters subscribe without issuing promotions. Configure the Klaviyo list for double opt-in and verify its actual consent behavior before launch. Registered welcome coupons are bound to customer ID plus account email, have one-use budgets, stable issuance identifiers and notification idempotency keys. Legacy unbound ART15 coupons are rejected during cart mutation/checkout; remove such a coupon from an existing cart before retrying. Existing database promotions/metadata still require an operational cleanup or reissue process; source changes do not migrate them.

Welcome-coupon checkout awaits the native completion workflow while holding a shared coupon lock and rechecks budget usage inside that lock, preventing concurrent carts from independently reading the same unused budget. Browser response close/abort does not release the workflow lock. Authorized retries of completed carts preserve native idempotency. The configured lease is five minutes; production workflow execution deadlines and downstream timeouts must be shorter than the lease. A stalled workflow that keeps running beyond the lease requires operational cancellation; exercise concurrency and payment recovery in a staging database before launch.

Cart responses use fixed field allowlists, including native mutation responses; request `fields` cannot expand customer reverse links to other carts, orders or saved addresses. Medusa requires unique `(email, has_account)` records, so guest identities can be shared across guest carts; they are never registered-account identities. String address references are rejected and supplied address object IDs are removed before native workflows. Line-item IDs must belong to the authorized cart, including native DELETE. Store payment-session creation and new checkout completion permit only `pp_stripe_stripe`; existing system/manual sessions cannot authorize an unpaid order. Welcome coupons must be applied after cart creation.

Public catalog fields are fixed for products, variants, types/tags, regions, collections/categories, shipping options (including price calculation), payment providers, return reasons, currencies and locales. Customer/profile/address responses and authenticated order lists also use fixed native safe fields. These resources have native reverse Graph links to carts or fulfillment addresses, so customer-supplied `fields` cannot expand them. Cart and payment resource projections are fixed separately; payment responses expose only the session's ID/provider/status and required client secret. All other Store Graph routes additionally reject the `cart`, `carts` and `cart_items` segments while preserving Medusa's default order/order-list restrictions. Keep this policy when adding new Store endpoints or public relations.

The public Store returns write endpoint is retired with 410. Return requests must go through customer support and the authenticated administrator approval workflow; the storefront return-policy page remains available. Direct `receive_now` input cannot invoke an anonymous return/receiving workflow.

`TRUSTED_PROXY_IPS` defaults to empty: rate limits use the socket peer and never trust X-Forwarded-For. Configure only direct proxies that overwrite X-Real-IP with one validated client address and prevent direct backend access. BFF deployments must obtain that address from a separately trusted ingress, never blindly relay a browser-supplied header. Without trusted ingress configuration all BFF users share the proxy address limit; tune limits only after that boundary is verified.

Local public uploads now use `public-uploads`; local private uploads use `private-uploads` and have no public download route. The controlled local route rejects SVG, traversal and escaping symlinks. Medusa also mounts its own public `static` directory before application routes: keep that directory empty. Production refuses startup when residual static entries exist and requires S3 storage. Move legacy local assets to appropriate controlled storage; do not publish old private files.

The S3 provider configuration alone does **not** establish private object access. R2 does not support S3 object ACLs, and an exposed public R2 bucket can serve an object regardless of an intended private flag. Use public R2 exclusively for public assets. Private files require an independent non-public bucket with verified policy and an authenticated download proxy/signed URL, or disable private uploads. Verify actual bucket policies, endpoint permissions and upload ACL compatibility before deployment; they were not inspected here.

## Vulnerability Reporting

Do not open a public issue for security reports. Send security concerns to `security@cansoria.com` with reproduction steps and impact details.

## Additional Resources

- [Medusa Documentation](https://docs.medusajs.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
