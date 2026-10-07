# Homepage image assets

Reference supplied by the user: `H:/谷歌浏览器下载/暖光宠物肖像品牌首页.png` (1024 × 1536).

The WebP files are individual photographic/illustration regions extracted from that reference. The six pet gallery assets include the original photo inset as part of each supplied composite image. Comparison labels are real HTML captions. No full-page screenshot is used as the page UI.

`hero-room.png` (1893 × 831) was created with the built-in Image Gen tool. Its consuming component is `src/app/components/home/PortraitHome.tsx`. The exact source's clean right-hand region, `hero-room-original-right.webp`, overlays the reconstructed photograph so the original dog and portrait remain faithful.

Generation prompt: Extract the reference's top hero photograph, remove all text/buttons/icons, preserve the golden retriever, framed portrait, cream sofa, olive vase, fireplace, warm lighting, and pale left-side space. Output a clean photographic room background, without UI, text or icons.

Icons use [Phosphor](https://phosphoricons.com/) through `@phosphor-icons/react`; body fonts are locally served through `@fontsource/dm-sans`.
