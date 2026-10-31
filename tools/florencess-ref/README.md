# FLORENCESS reference tooling

Reproduction kit for the `entntnt.com` storefront replica that lives in
`frontend/src/components/florencess/`. Everything here exists to answer one
question: **how far is the replica from the reference, in pixels?**

The reference theme is OpenCart 3 + Journal3 + Master Slider behind Cloudflare.
Measurement is done in a real browser over the Chrome DevTools Protocol — no
screenshots are interpreted, only computed styles and `getBoundingClientRect()`
numbers, so results are objective and diffable.

## Prerequisites

| Need | Default | Override |
| --- | --- | --- |
| Headless Chrome with CDP | `127.0.0.1:9228` | edit `CDP` in the script |
| Replica dev server | `http://localhost:3030` | edit the `Page.navigate` URL |
| Reference site | `https://entntnt.com` | edit the `Page.navigate` URL |
| Repository root | three levels above this file | `CANSORIA_ROOT` |
| Scrape workspace | `$CANSORIA_ROOT/frontend_ref` | `FLORENCESS_REF_DIR` |

Start Chrome once and leave it running:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --remote-debugging-port=9228 `
  --user-data-dir=<scratch-dir> --no-first-run --no-default-browser-check `
  --disable-gpu --window-size=1440,1200
```

`frontend_ref/` is deliberately **not** versioned: it accumulates scraped HTML,
the Chrome profile and the downloaded asset tree (hundreds of MB). Create it and
re-run the `pipeline/` scrapers to rebuild it.

## probe/ — measurement

Each probe attaches to CDP, sets a viewport with
`Emulation.setDeviceMetricsOverride`, waits for lazy content, then evaluates one
expression and prints JSON. Reference and replica halves run in the same script
so the numbers are directly comparable.

| Script | Answers |
| --- | --- |
| `probe-home-rows.mjs` | row-by-row homepage geometry: y, height, image count, text head, for both sites |
| `probe-home-detail.mjs` | per-row typography and inner block structure |
| `probe-local-rows.mjs` | the same row survey for the replica alone, plus mosaic cells, USP items, social halves |
| `probe-cards.mjs` | product tile geometry: slot width, gutter, image box, name/price baselines |
| `probe-mosaic-social.mjs` | four-column mosaic cells (wide span, inset) and the two social/newsletter halves |
| `probe-social-text.mjs` | copy scale inside the social and newsletter halves |
| `probe-usp.mjs` | the benefit strip: item widths, padding, colour, letter-spacing, `text-transform` |
| `probe-usp-pages.mjs` | whether the benefit strip appears on pages other than `/` |
| `probe-easy-returns.mjs` | the `EASY RETURNS` item specifically, across candidate containers |
| `probe-topbar.mjs` | announcement marquee: height, background, message list, separators |
| `probe-marquee3.mjs` | marquee message spacing and duplication |
| `probe-hero-full.mjs` | hero slides, per-slide copy, aspect and image source |
| `probe-shell.mjs` | header and footer shell: rows, heights, sticky offsets |
| `probe-footer-rows.mjs` | footer bands: columns, locale row, legal rows, spacers |
| `probe-width.mjs` | article column width across viewports (the static-page measure) |
| `probe-page-layout.mjs` | static page layout blocks at several widths |
| `compare-pages.mjs` | block-by-block diff of a static page between reference and replica |

Typical run:

```powershell
node tools/florencess-ref/probe/probe-home-rows.mjs
```

## pipeline/ — scrape and generate

Run in this order when re-deriving the data modules from scratch:

1. `fetch_assets.py` — pull images and fonts referenced by the homepage into
   `frontend/public/florencess/`.
2. `extract-pages2.mjs` — crawl the five policy pages and dump their text blocks
   with computed styles into `frontend_ref/pages/`.
3. `scrape-shelves.mjs` — read both homepage shelves (names, prices, struck
   prices, discount labels, image pairs) into `data/shelf-*.json`.
4. `gen-products.mjs` — `data/*.json` → `frontend/src/lib/florencess-products.ts`.
5. `gen-pages2.mjs` — `frontend_ref/pages/*` → `frontend/src/lib/florencess-pages.ts`.
6. `fetch-missing.mjs` — re-download image slots that the first pass skipped.
7. `fix-mojibake.mjs` — repair UTF-8 that passed through a non-UTF-8 console
   (`3–5 Days Delivery` turning into `3鈥?` was a real regression).

`gen_data.py` derives the homepage content module; check it against
`frontend/src/lib/florencess-data.ts` before trusting its output.

Because the generators overwrite files under `frontend/src/lib/`, review the diff
before committing — they are the only scripts here that mutate product code.

## data/ — captured inputs

| File | Contents |
| --- | --- |
| `products.json` | every product record scraped from the reference homepage |
| `shelf-sale.json` | the `WAREHOUSE SALE FOR $9.99` shelf, 16 tiles |
| `shelf-also.json` | the `YOU MAY ALSO LIKE` shelf, 16 tiles |
| `images.json` | remote image URL → local asset path map |

## Reference geometry (1440px viewport)

Kept here so a regression is obvious without re-running anything:

| Row | y | height | images |
| --- | --- | --- | --- |
| hero | 214 | 411 | 2 |
| benefit strip | 625 | 43 | 0 |
| shelf title | 668 | 77 | 0 |
| warehouse shelf | 755 | 361 | 48 (16 × 3) |
| category mosaic | 1156 | 763 | 15 |
| shelf title | 1918 | 77 | 0 |
| recommendations | 2005 | 360 | 48 |
| social + newsletter | 2405 | 337 | 2 |

`site-wrapper` spans 165 → 2742 (2577 tall); the footer adds 510 below it.

Half-open caveats worth remembering:

- The 50px gap between header and first row is correct on both sides — the
  reference `site-wrapper` starts at 165 and the slider at 214.
- The benefit strip is one 43px line of inline links at
  `12px/18px, rgb(51,122,183), padding 0 30px`, with no borders. The source text
  is literally upper case, so `text-transform` stays `none`.
- Shelf titles are `18px / 400 / letter-spacing normal / text-align start`, not
  centred banners.
- The mosaic is a gapless 4-column grid, 1165px wide and centred in 1425; tiles
  are 583×257 (span 2) or 291×257 (span 1), with images inset 5px.
- The reference `/shop` returns 404, so the homepage and the five policy pages
  are the whole reproducible surface.
