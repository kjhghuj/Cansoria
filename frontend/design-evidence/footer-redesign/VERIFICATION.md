# Footer redesign verification

Verified on 2026-10-09 (Asia/Shanghai) against the final implementation.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run build` | Passed after final captcha/error handling corrections |
| `npm run test:security` | Passed: 15 suites, 82 tests |
| `node design-evidence/footer-redesign/verify-footer.cjs` | Passed: 46 checks, 0 failures |
| Screenshot recapture and site checks | Passed: 27 checks, 0 failures |

The Chromium regression runner compiles the actual `Footer`, `Newsletter`, and
`useNewsletter` source with the existing SWC runtime and executes them in real
React DOM. Its isolated fixture replaces only Next link/image wrappers, Turnstile,
and fetch; no production configuration or provider records are changed. It uses
the existing bundled Playwright runtime and a cached Chromium executable, so no
production dependencies were added.

Newsletter checks cover unique input IDs and labels, missing configuration,
empty/malformed emails, missing/expired/failed captcha tokens, synchronous duplicate
submissions, pending controls, request payload, confirmation copy, and absence of
coupon display. Mock HTTP 400/403/429/503 and network failures preserve the email,
reset the token, preserve API guidance through a new captcha success, and permit
retry after verification.

The production app passed shared-footer checks on `/`, `/shop`,
`/product/pet-portrait-oil-painting`, `/contact`, `/privacy`, and `/journal`.
Each returned 200; navigation matched on all six pages, and Journal displayed one
footer newsletter. All 14 unique internal footer destinations returned 200.

Layout checks passed at 320, 375, 390, 768, 1024, and 1440 pixels with no footer or
document horizontal overflow. Configured captcha fixtures additionally passed at
188 pixels (the effective width of a 375-pixel screen at 200% zoom), including
compact 150×140 sizing below 340 pixels and unscaled flexible sizing above it.
Keyboard focus and a 200% footer zoom check also passed. These fixtures model the
provider's documented dimensions; they do not validate a live provider iframe.

## Preview and screenshots

Production preview: `http://localhost:3032` (owned server PID 40076).

- Desktop: `H:\Cansoria\frontend\design-evidence\footer-redesign\footer-1440.png`
- Mobile: `H:\Cansoria\frontend\design-evidence\footer-redesign\footer-390.png`
- Additional: `footer-320.png`, `footer-375.png`, `footer-768.png`, `footer-1024.png`.

Machine-readable results: `verification-results.json`.
Command output: `lint.log`, `build.log`, `security-tests.log`, `browser-tests.log`.
Screenshot recapture results: `verification-screenshot-results.json` and
`screenshot-checks.log`. Final images use native full-page document-coordinate
crops at scroll position zero, after naturally revealing and decoding lazy footer
images. This avoids a sticky navigation overlay in the footer screenshots.

To reproduce the browser checks using the available runtime:

```powershell
$env:CHROMIUM_EXECUTABLE_PATH = 'C:\Users\admin\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe'
node design-evidence\footer-redesign\verify-footer.cjs
```

`FOOTER_TEST_URL`, `PLAYWRIGHT_MODULE_PATH`, and `CHROMIUM_EXECUTABLE_PATH` can be
overridden to use another local test setup.

## Provider verification limits

Boolean-only checks of local environment files found the Turnstile site key,
Turnstile secret key, Klaviyo API key, and Klaviyo list ID unconfigured. The live
preview correctly shows signup temporarily unavailable and disables submission.
No actual signup, email delivery, or Klaviyo operation was attempted. Provider
connectivity and the target list's double opt-in setting remain unverified and
must be checked in a configured test environment before enabling real signup.
