# Pet portrait pages and customization

The storefront now has independent `/upload-photo`, `/gallery`, `/how-it-works`, `/artists`, `/reviews`, `/faq` and `/contact` pages. About and the pet portrait customizer share the warm cream palette, DM Sans and Georgia typography. Artist biographies and customer reviews remain explicitly unpublished until verified material is available.

## Customization flow

1. Style cards link to `/product/pet-portrait-oil-painting?style=<style>`.
2. The storefront creates its normal cart and keeps the guest access capability in the existing HttpOnly cookie.
3. `POST /store/carts/:id/photos` validates a JPG, PNG or WebP reference up to 10 MB and stores it with the Medusa file provider using private access. HEIC must be exported as JPG. A cart can have up to 20 uploaded references.
4. The upload record is signed, bound to its cart and persisted in `cart.metadata.portrait_photos`. Filenames supplied by users never become storage keys. Files are served through an authorized API rather than a public storage URL.
5. `POST /store/carts/:id/portrait-items` validates the product, style and signed photo record, then calls the standard Medusa cart workflow. It stores `metadata.portrait` on the individual line item: commission ID, style, reference ID/name, source cart and artist notes. Each addition receives its own commission ID to prevent distinct portraits merging. Quantity means copies of the same customization.
6. Medusa's cart completion workflow copies line-item and cart metadata into the order. The storefront order APIs expose only the allowlisted portrait fields. Customers with account ownership or a valid emailed access token can view linked references. Admin order details show the reference and artist notes with an authenticated download link.

The upload page remembers a draft photo in sessionStorage using its cart ID. This contains a photo descriptor, never an access token. The customizer checks the saved reference against the backend before allowing purchase. The server copy remains durable independently of the browser draft.

## Storage and deployment

Development uses the configured `private-uploads` directory outside the static file server. Upload directories are Git-ignored. Production uses the configured S3/R2 file provider. Its bucket must block anonymous access to portrait references; a bucket served in its entirety by an unrestricted public R2 custom domain is unsuitable for private customer photos. Verify the deployment's actual access policy before going live.

Production also requires `PORTRAIT_PHOTO_SECRET`, a stable random secret of at least 32 characters used to validate durable photo records. Keep it separate from JWT secret rotation. Replacing it requires re-signing existing photo records; do not rotate it as part of routine session-key rotation.

Upload and customization routes share the cart identity lock with checkout completion and ownership updates. File creation is rolled back if metadata persistence fails. Unused uploads are retained on the cart; define an abandoned-cart retention policy before launch. The 20-file cap bounds retained references per cart.

Payment initialization and order completion both check that each pet portrait has a valid style and its own signed reference. Existing carts containing unconfigured pet portraits must be customized again before checkout.

## Contact form

Set `CONTACT_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`, and storefront `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. The contact challenge uses action `contact`; newsletter verification keeps its existing action. Inquiries are sent as plain text to the configured fixed studio address, with the customer's validated email as Reply-To. Missing configuration, failed CAPTCHA or provider failure returns an error and never reports successful delivery. Tests mock email delivery and do not send actual inquiries.

## Verification limits

Run frontend production build and security tests, backend/admin TypeScript checks, and backend unit tests. Local API testing can verify upload, private preview and multiple styled cart items without paying. A complete Stripe test-mode checkout, webhook delivery and resulting order should be verified against the intended deployment before launch. Painting milestones and carrier tracking remain outside this change.
