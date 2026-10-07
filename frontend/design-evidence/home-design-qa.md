# Homepage design QA

Date: 2026-10-07. Scope: homepage, shared navigation and footer.

## Evidence and normalization

- Source visual truth: `H:/谷歌浏览器下载/暖光宠物肖像品牌首页.png`, 1024 × 1536 pixels.
- Browser-rendered implementation: `frontend/design-evidence/home-desktop-final.jpg`, 1016 × 1913 pixels, captured in the Codex in-app browser at a 1024 × 900 CSS viewport.
- Density: 1 CSS pixel per image pixel. The browser excludes its 8px scrollbar from the screenshot. Comparison adds an 8px right gutter; it does not rescale the page. Only the first 1536px are compared because the requested original footer extends beyond the reference.
- State: `/`, page at top, menus and reviews dialog closed, all visible images loaded.
- Full-view comparison: `frontend/design-evidence/comparison-final.png`; reference on left, implementation on right. Both artifacts were opened together and inspected.
- Focused comparisons: `frontend/design-evidence/comparison-hero-final.png` and `frontend/design-evidence/comparison-reviews-final.png`; header, typography, hero subjects, quote cards and final CTA inspected at readable scale.
- Responsive evidence: `frontend/design-evidence/home-mobile-final.png` (390px CSS viewport), `home-mobile-320.png` (320px), and `home-tablet.png` (768px). These are adaptations; no mobile source was supplied.

## Findings and comparison history

1. **[P1, resolved] Display font too condensed.** The initial Libre Caslon Display implementation made the hero and section headings substantially narrower than the reference. Replaced it with Georgia and adjusted the headline size. Body copy uses locally served DM Sans. Evidence: `home-desktop-v1.png`, `comparison-v2.png`, `comparison-v3.png`, and the final comparison.
2. **[P2, resolved] Review card heights drifted.** Equal grid tracks reduced the first quote's available width, causing extra wrapping and pushing the final CTA down. Used the source's unequal track proportions and adjusted quote size. Final cards fit the reference's approximately 100px height.
3. **[P1, resolved] Hero subject drift.** Generated clean background retained the room but changed the dogs. The clean right-hand photographic region is now extracted directly from the supplied source and layered over the reconstructed left room. Main subjects, frame and fireplace match the source.
4. **[P2, resolved] Desktop menu click closed its own menu.** Hover opening and click toggling conflicted. Removed hover opening; click opens, repeated click closes, focus leaving and Escape dismiss. Retested in the browser.
5. **[P2, resolved] Mobile benefits covered the dog's face.** Moved the benefits beneath the photograph and increased the mobile hero height. The latest mobile screenshot shows the complete face and functional controls.
6. **[P2, resolved] Header and hero rhythm.** Focused comparison found navigation displaced right and hero controls approximately 8px low. Adjusted nav spacing, headline size, top padding and button margins. The final focused capture confirms the revised alignment.

## Required fidelity surfaces

- **Fonts and typography:** Georgia display headings preserve the reference's serif hierarchy and two-line hero; DM Sans provides the matching rounded body treatment. Reference font metadata is unavailable, so small glyph/antialiasing differences remain P3. No headline clipping was observed at tested widths.
- **Spacing and layout:** Preserved six source sections and their order. At 1024px the hero is approximately 447px, transformation section 228px, process band 156px, and final CTA 209px. Six portrait cards and three review cards use the source proportions. The custom footer is intentionally additional.
- **Colors and tokens:** Warm paper `#f8f5f0`, linen `#f1e9df`, coffee CTA `#624126`, dark text `#1c1712`, caramel ratings `#bd722b`. Footer continues the warm palette with `#eee4d8`.
- **Images and asset fidelity:** Source image crops supply the gallery, comparison, reviews, final lifestyle photo and hero's main subjects. Built-in Image Gen only reconstructs the clean left-side room obscured by source UI. No placeholder imagery or handcrafted SVG/CSS illustrations. Phosphor library icons provide the thin line controls and guarantees.
- **Copy and content:** Hero, transformation, process, six pet names/breeds, review quotes and final CTA follow the source. Footer copy was authored in the same brand voice. Actual text, buttons and links remain selectable HTML.

## Interactions and validation

- Desktop Pet Portraits dropdown opens and exposes existing shop categories; Escape dismisses it.
- Search opens the existing search overlay and closes through its existing close control.
- See All Reviews opens a native modal with the three supplied testimonials; Close reviews restores the page.
- Mobile menu opens and closes, with native expandable category lists.
- Create Your Portrait navigates successfully to the existing `/product/pet-portrait-oil-painting` route; its actual photo upload, size and framing controls load.
- 320px, 390px and 768px layouts show no horizontal page overflow. Final mobile hero shows the dog unobstructed.
- Fresh final browser session: no console errors or warnings; all visible homepage images loaded.
- TypeScript and targeted ESLint passed. Production build passed twice. Existing CMS article fetching logs HTTP 426 during sitemap generation; this does not affect the homepage or build result.
- Diff whitespace check passed. Purchase submission and account authentication were not part of this visual change.

## Follow-up polish

- P3: Exact source font metadata is unknown; glyph widths and antialiasing differ slightly.
- P3: Source crops inherit the supplied screenshot's resolution. Larger original photography would improve sharpness on large displays.
- P3: Library palette/paintbrush strokes differ slightly from the reference icons.

## Implementation checklist

- [x] Homepage sections and original imagery placed.
- [x] Matching shared navigation and original footer implemented.
- [x] Responsive layouts and primary interactions checked.
- [x] Full-view and focused comparisons inspected after fixes.
- [x] No remaining actionable P0/P1/P2 findings.

final result: passed
