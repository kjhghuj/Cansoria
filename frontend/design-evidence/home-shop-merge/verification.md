# Home / Pet Portraits merge verification

Verified on 2026-10-09 (Asia/Shanghai) against the existing local frontend at `http://localhost:3030`.

## Automated checks

- `npm run test:security -- --cacheDirectory=.next/jest-cache`: passed after the native-anchor fix, 18 suites and 95 tests.
- `npm run lint`: passed, exit code 0.
- `npm run build`: passed, exit code 0. The existing CMS articles request still reports HTTP 426 during prerendering.
- Lint and production build were rerun successfully after the native-anchor fix. Final code review found no actionable issues.
- Static reference checks show `/shop` only in the redirect configuration. Obsolete Shop page, CSS, header, filters and unreferenced product grid are removed; image assets remain.

## HTTP and metadata checks

- `/shop`: HTTP 308, `Location: /#styles`.
- `/shop?category=dogs&utm_source=merge-verification`: HTTP 308, `Location: /?category=dogs&utm_source=merge-verification#styles`.
- `/sitemap.xml`: HTTP 200; 20 URLs; no `/shop` or category-filter URLs; includes home, 7 products, gallery and journal.
- `/`: HTTP 200; canonical resolves to `http://localhost:3030`; Open Graph image resolves to `/images/home/hero-room.png`; exactly one H1 and one `id="styles"` anchor.

## Browser evidence

The parent agent verified these behaviors in the actual local browser:

- All four home style cards navigate to the product page with their corresponding `?style=` value. The selected radio and preview image both match Classic Oil, Soft Impression, Textured Oil and Dark Classic.
- Search shortcuts show the four styles. Searching for `pet portrait` still returns the portrait product and a journal article; closing the overlay works.
- Clicking the same `/#styles` overview link again scrolls back to the section. Native anchors fix the previous Next Link same-URL behavior.
- Mobile menu closes for both same-page style navigation and cross-page Gallery navigation. Returning from Gallery to Pet Portraits positions the style heading below the navbar.
- Browser Back returns to Gallery and Forward returns to `/#styles` with the heading visible.
- Opening `/shop?category=dogs&utm_source=qa#craft` resolves to `/?category=dogs&utm_source=qa#styles`, preserving queries and replacing the old fragment.
- Keyboard navigation reaches the style cards with a visible 2px solid focus outline.
- Reduced-motion emulation changes document scrolling to `auto` and style-image transitions to `0s`. Emulation and viewport overrides were reset afterward.

| Width | Columns | Horizontal overflow | Style scroll margin | Screenshot |
| --- | --- | --- | --- | --- |
| 320px | 2 | None | 84px | [Phone 320](styles-320.jpg) |
| 390px | 2 | None | 84px | [Phone 390](styles-390.jpg) |
| 768px | 2 | None | 108px | [Tablet](styles-768.jpg) |
| 1024px | 4 | None | 108px | [Desktop 1024](styles-1024.jpg) |
| 1440px | 4 | None | 108px | [Desktop 1440](styles-1440.jpg) |

All four style images loaded successfully and use `object-fit: contain`; card text has no horizontal overflow. The style heading remains below the sticky navbar. Phone and desktop screenshots show the full style grid; the tablet viewport shows the first row and the start of the second row.
