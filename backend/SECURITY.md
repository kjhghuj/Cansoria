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
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Verified sender email |
| `RESEND_REPLY_TO` | Customer reply-to email |
| `STRIPE_API_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for frontend |
| `KLAVIYO_PRIVATE_KEY` | Klaviyo private key |
| `KLAVIYO_LIST_ID` | Klaviyo newsletter list ID |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
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

Do not use `supersecret` in production.

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
- Add rate limiting before production launch for newsletter, auth, checkout, and order lookup endpoints.

## Vulnerability Reporting

Do not open a public issue for security reports. Send security concerns to `security@cansoria.com` with reproduction steps and impact details.

## Additional Resources

- [Medusa Documentation](https://docs.medusajs.com/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
