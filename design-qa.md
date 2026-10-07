# CANSORIA Pet Oil Paintings — design QA

Date: 2026-10-07. Route: http://localhost:3030/shop. Selected visual: displayed option 2, The Collector's Gallery.

Previous homepage QA is preserved at frontend/design-evidence/home-design-qa.md.

## Comparison target and evidence

- Source visual truth: H:/Cansoria/frontend/design-concepts/pet-oil-paintings/displayed-option-2.png, 968 × 1625 pixels.
- Same-width comparison viewport: 968 × 900 CSS px, desktop, scroll position 0, menus/search closed.
- Final browser capture: H:/Cansoria/frontend/design-evidence/pet-oil-reference-size-final.jpg, 960 × 1718 pixels. Browser screenshots exclude the 8px scrollbar. Comparison pads 8px on the right; source content is not stretched. Density: 1 image pixel per CSS pixel.
- Full-view paired comparison: H:/Cansoria/frontend/design-evidence/pet-oil-comparison-final.png, source on left and rendered page on right.
- Focused header/Hero paired comparison: H:/Cansoria/frontend/design-evidence/pet-oil-hero-comparison-final.png. Source crop is 968 × 441; rendered region is 960 × 478. Background padding preserves their content sizes.
- Main 16:9 desktop viewport: 1440 × 810 CSS px. Final full-page screenshot: H:/Cansoria/frontend/design-evidence/pet-oil-desktop-final.jpg, 1432 × 2349 pixels.
- Mobile viewport: 390 × 844 CSS px. H:/Cansoria/frontend/design-evidence/pet-oil-mobile-final.jpg, 382 × 2535 pixels.
- Tablet viewport: 768 × 1024 CSS px. H:/Cansoria/frontend/design-evidence/pet-oil-tablet-final.jpg, 760 × 3124 pixels. Focused evidence: pet-oil-tablet-hero-final.png.
- Additional wide desktop check: 1920 × 1080 CSS px.

The written brief's 430–500px desktop Hero requirement takes priority over proportional scaling of the generated raster: Hero measures 430px at the source-width comparison, 480px at 1440px and 500px at 1920px. The source Hero is 400px tall. The clean generated photograph is bounded and right-aligned to preserve the complete wall frame and seated dog. Tablet/mobile stack copy above the photograph. These are intentional responsive adaptations.

## Findings and comparison history

1. Initial paired full-view comparison: pet-oil-comparison-initial.png; desktop evidence: pet-oil-desktop-initial.jpg.
   - [P2, fixed] Unbounded cover cropping removed the wall frame's top edge on wide desktop. Bounded the photograph's width against Hero height and kept it right-aligned. The final desktop and focused comparisons show the intact framed portrait.
   - [P2, fixed] Section padding, buttons and banner minimum height drifted from the selected concept, producing excess vertical spacing; section heading sizes were too small. Changed these measurements to responsive source-based sizes, restored the shorter banner, and reduced the before/after arrow. Same-width page height reduced from 1926px to 1718px; all five source regions remain present and ordered.
   - [P2, fixed] Banner subtitle wrapped at the source-width viewport. Corrected available copy width. Final paired comparison shows the subtitle on one line.
2. Responsive review: pet-oil-tablet-initial.jpg.
   - [P2, fixed] At tablet widths, the Hero's live text intersected window/plant detail. Moved the stacked photo layout breakpoint to 900px. Fresh final tablet capture shows text entirely above the photograph, with no overlap.
   - Increased compact before/after captions to 12px. Final mobile capture retains the two-column comparison and readable labels.
3. Final paired full-view and focused comparison opened and inspected after all fixes.
   - No remaining actionable P0/P1/P2 findings. Cream/ivory palette, serif typography, four wood-framed portraits, left-copy/right-artist banner, simple matched photo/painting comparison and minimal closing/footer match the selected direction.
   - All interface headings, captions, prices and links are HTML. Raster regions are artwork/photography only; arrows and utilities use Phosphor icons.

## Functional and technical checks

- Exactly five major page sections, four style cards, one H1; no filter sidebar, checkboxes, ratings, review section, trust strip, promotion bar, chat bubble or exit popup on /shop.
- Desktop four-column and mobile/tablet two-column style layouts; all eight page images loaded. No horizontal overflow at tested widths.
- Gallery link reaches the styles anchor; mobile navigation opens and closes after an anchor selection.
- Search opens, accepts input, returns the existing Pet Portrait Oil Painting result for “pet”, and closes.
- Primary Create Your Portrait link loads the existing product page with framing/orientation/size and photo controls. All four card links and the closing CTA target that same existing commission page.
- Our Process points to the existing homepage process section. Existing homepage navigation/footer retain their default variants; category-specific CSS is scoped.
- Fresh final category browser session: no console errors or warnings.
- Targeted ESLint and TypeScript checks passed. Production build passed after final changes. The build still emits the existing, non-fatal CMS article fetch 426 notice while generating sitemap content.
- Manual code review: checked route metadata, image paths/sizes, shared component defaults, pathname-based layout changes, link destinations, focus treatment and responsive CSS scopes.

## Scope and follow-up polish

The four cards are art-style entry points to the existing commission product, not four new backend SKUs. “From $129” follows the supplied design copy; the existing product's regional variant pricing remains authoritative at checkout. Product-detail/checkout redesign and backend style persistence are outside this category-page change.

P3: The raster source's painterly photographic texture and tiny spacing differences vary from the browser's live typography. High-resolution original artwork photography can replace concept crops when supplied.

- [x] Selected visual resolved from actual displayed order.
- [x] All five sections implemented with supplied copy and local imagery.
- [x] Full and focused paired comparisons opened and inspected.
- [x] Earlier P2 findings fixed and final evidence captured.
- [x] Responsive and primary navigation/commission-entry behavior checked.
- [x] Final build, lint and type checks passed.

final result: passed

## Navigation refinement — 2026-10-07

User instruction overrides the original homepage's dropdown navigation: all shared headers now display Pet Portraits, Gallery, How It Works, Our Artists, Reviews, About as direct links. Pet Portraits targets /shop. Desktop and mobile use the same link array; category dropdown markup, caret icons, state and unused CSS have been removed. Default desktop navigation is centered between the wordmark and utilities.

Verified homepage and /shop at 1440px and homepage mobile menu at 390px. Exactly six links and zero nested menus; Pet Portraits loads Pet Oil Paintings, mobile menu closes with Escape. Targeted ESLint and TypeScript checks pass; browser console shows no errors/warnings. Manual review checked shared variant defaults and remaining menu state.

Evidence: frontend/design-evidence/navigation-direct-header.jpg, navigation-direct-desktop.jpg, navigation-direct-mobile.jpg.

final result: passed
