# FLORENCESS route matrix

Inventory: 83 unique reference entries; route kinds: {"account-alias":5,"article":6,"category":25,"home":1,"product":32,"proxy":8,"static":6}.
Mode: HTTP against pre-confirmed http://127.0.0.1:3031, redirects followed manually (max 6), no external redirects.
Inputs: 75 rows from `ref-page-status.json` plus eight live nonduplicate rows from `ref-extra-routes.json`. Reference `status` is a *followed* historical result; first-hop reference HTTP code is not recorded in these inputs.
Static/unmapped or runtime mismatches: 0.

| Reference | Ref final | Kind | Target | Static evidence | Capture | Local first hop | Local final | Local title / issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | / | home | / | app/page.tsx | — | 200 | 200 / | FLORENCESS \| Affordable Online Shopping for Bags, Shoes &amp; Clothing |
| /about-us | /about-us | static | /about-us | app/about-us/page.tsx | — | 200 | 200 /about-us | About Us \| FLORENCESS |
| /account-voucher.html | /login.html | account-alias | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount%3Ftab%3Dcoupons | 200 /account/login?returnTo=%2Faccount%3Ftab%3Dcoupons | Account Login \| FLORENCESS |
| /address-book.html | /login.html | account-alias | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount%3Ftab%3Daddresses | 200 /account/login?returnTo=%2Faccount%3Ftab%3Daddresses | Account Login \| FLORENCESS |
| /affiliate-program | /affiliate-program | article | /affiliate-program | app/[slug]/page.tsx | — | 200 | 200 /affiliate-program | Affiliate Program \| FLORENCESS |
| /always-palazzo-jean-85651 | /always-palazzo-jean-85651 | product | /always-palazzo-jean-85651 | app/[slug]/page.tsx | detail captured | 200 | 200 /always-palazzo-jean-85651 | Always Palazzo Jean \| FLORENCESS |
| /amore-drift-ruffle-tank-85992 | /amore-drift-ruffle-tank-85992 | product | /amore-drift-ruffle-tank-85992 | app/[slug]/page.tsx | detail captured | 200 | 200 /amore-drift-ruffle-tank-85992 | Amore Drift Ruffle Tank \| FLORENCESS |
| /axiom-vibe-long-sleeve-top-85860 | /axiom-vibe-long-sleeve-top-85860 | product | /axiom-vibe-long-sleeve-top-85860 | app/[slug]/page.tsx | detail captured | 200 | 200 /axiom-vibe-long-sleeve-top-85860 | Axiom Vibe Long Sleeve Top \| FLORENCESS |
| /bags-all | /bags-all | category | /bags-all | app/[slug]/page.tsx | 3/3 pages | 200 | 200 /bags-all | Bags \| FLORENCESS |
| /ballet-flats | /ballet-flats | category | /ballet-flats | app/[slug]/page.tsx | 0/1 pages | 200 | 200 /ballet-flats | Ballet Flats \| FLORENCESS |
| /bastion-high-rise-shorts-85747 | /bastion-high-rise-shorts-85747 | product | /bastion-high-rise-shorts-85747 | app/[slug]/page.tsx | detail captured | 200 | 200 /bastion-high-rise-shorts-85747 | Bastion High Rise Shorts \| FLORENCESS |
| /belleza-v-neck-tee-86346 | /belleza-v-neck-tee-86346 | product | /belleza-v-neck-tee-86346 | app/[slug]/page.tsx | detail captured | 200 | 200 /belleza-v-neck-tee-86346 | Belleza V Neck Tee \| FLORENCESS |
| /boots | /boots | category | /boots | app/[slug]/page.tsx | 2/2 pages | 200 | 200 /boots | Boots \| FLORENCESS |
| /boundless-mid-rise-flare-in-coated-asphalt-85648 | /boundless-mid-rise-flare-in-coated-asphalt-85648 | product | /boundless-mid-rise-flare-in-coated-asphalt-85648 | app/[slug]/page.tsx | detail captured | 200 | 200 /boundless-mid-rise-flare-in-coated-asphalt-85648 | Boundless Mid Rise Flare in Coated Asphalt \| FLORENCESS |
| /careers | /careers | article | /careers | app/[slug]/page.tsx | — | 200 | 200 /careers | Careers \| FLORENCESS |
| /castle-tank-86291 | /castle-tank-86291 | product | /castle-tank-86291 | app/[slug]/page.tsx | detail captured | 200 | 200 /castle-tank-86291 | Castle Tank \| FLORENCESS |
| /clothing | /clothing | category | /clothing | app/[slug]/page.tsx | 8/8 pages | 200 | 200 /clothing | Clothing \| FLORENCESS |
| /cookie-policy | /cookie-policy | static | /cookie-policy | app/cookie-policy/page.tsx | — | 200 | 200 /cookie-policy | Cookie Policy \| FLORENCESS |
| /crimson-allure-dye-high-rise-7-8-legging-86077 | /crimson-allure-dye-high-rise-7-8-legging-86077 | product | /crimson-allure-dye-high-rise-7-8-legging-86077 | app/[slug]/page.tsx | detail captured | 200 | 200 /crimson-allure-dye-high-rise-7-8-legging-86077 | Crimson Allure Dye High Rise 7/8 Legging \| FLORENCESS |
| /customer-rewards-program | /customer-rewards-program | article | /customer-rewards-program | app/[slug]/page.tsx | — | 200 | 200 /customer-rewards-program | Customer Rewards Program \| FLORENCESS |
| /denim | /denim | category | /denim | app/[slug]/page.tsx | 2/2 pages | 200 | 200 /denim | Denim \| FLORENCESS |
| /deseo-snap-henley-tee-86359 | /deseo-snap-henley-tee-86359 | product | /deseo-snap-henley-tee-86359 | app/[slug]/page.tsx | detail captured | 200 | 200 /deseo-snap-henley-tee-86359 | Deseo Snap Henley Tee \| FLORENCESS |
| /dresses | /dresses | category | /dresses | app/[slug]/page.tsx | 2/2 pages | 200 | 200 /dresses | Dresses \| FLORENCESS |
| /eclipse-pulse-knit-tank-85804 | /eclipse-pulse-knit-tank-85804 | product | /eclipse-pulse-knit-tank-85804 | app/[slug]/page.tsx | detail captured | 200 | 200 /eclipse-pulse-knit-tank-85804 | Eclipse Pulse Knit Tank \| FLORENCESS |
| /elite | /elite | product | /elite | app/[slug]/page.tsx | detail captured | 200 | 200 /elite | Elite \| FLORENCESS |
| /enchant-tone-crop-rib-tank-85967 | /enchant-tone-crop-rib-tank-85967 | product | /enchant-tone-crop-rib-tank-85967 | app/[slug]/page.tsx | detail captured | 200 | 200 /enchant-tone-crop-rib-tank-85967 | Enchant Tone Crop Rib Tank \| FLORENCESS |
| /facet-bloom-lace-top-85997 | /facet-bloom-lace-top-85997 | product | /facet-bloom-lace-top-85997 | app/[slug]/page.tsx | detail captured | 200 | 200 /facet-bloom-lace-top-85997 | Facet Bloom Lace Top \| FLORENCESS |
| /fina-vita-twist-crop-top-86268 | /fina-vita-twist-crop-top-86268 | product | /fina-vita-twist-crop-top-86268 | app/[slug]/page.tsx | detail captured | 200 | 200 /fina-vita-twist-crop-top-86268 | Fina Vita Twist Crop Top \| FLORENCESS |
| /final-few | /final-few | category | /final-few | app/[slug]/page.tsx | 0/1 pages | 200 | 200 /final-few | Final Few \| FLORENCESS |
| /fission-stella-crochet-detail-top-85837 | /fission-stella-crochet-detail-top-85837 | product | /fission-stella-crochet-detail-top-85837 | app/[slug]/page.tsx | detail captured | 200 | 200 /fission-stella-crochet-detail-top-85837 | Fission Stella Crochet Detail Top \| FLORENCESS |
| /fulgor-mini-dress-86131 | /fulgor-mini-dress-86131 | product | /fulgor-mini-dress-86131 | app/[slug]/page.tsx | detail captured | 200 | 200 /fulgor-mini-dress-86131 | Fulgor Mini Dress \| FLORENCESS |
| /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | product | /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | app/[slug]/page.tsx | detail captured | 200 | 200 /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | Gasa Cielo Stretch Mesh Long Sleeve Top \| FLORENCESS |
| /grazia-stile-dead-tee-86297 | /grazia-stile-dead-tee-86297 | product | /grazia-stile-dead-tee-86297 | app/[slug]/page.tsx | detail captured | 200 | 200 /grazia-stile-dead-tee-86297 | Grazia Stile Dead Tee \| FLORENCESS |
| /heels | /heels | category | /heels | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /heels | Heels \| FLORENCESS |
| /immortal-girl-crop-flare-85618 | /immortal-girl-crop-flare-85618 | product | /immortal-girl-crop-flare-85618 | app/[slug]/page.tsx | detail captured | 200 | 200 /immortal-girl-crop-flare-85618 | Immortal Girl Crop Flare \| FLORENCESS |
| /index.php?route=checkout/cart | /index.php?route=checkout/cart | proxy | /cart | proxy.ts | — | 308 → /cart | 200 /cart | FLORENCESS \| Affordable Online Shopping for Bags, Shoes &amp; Clothing |
| /joya-wide-leg-jean-85624 | /joya-wide-leg-jean-85624 | product | /joya-wide-leg-jean-85624 | app/[slug]/page.tsx | detail captured | 200 | 200 /joya-wide-leg-jean-85624 | Joya Wide Leg Jean \| FLORENCESS |
| /leather-belt-bags | /leather-belt-bags | category | /leather-belt-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-belt-bags | Leather Belt Bags \| FLORENCESS |
| /leather-bucket-bags | /leather-bucket-bags | category | /leather-bucket-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-bucket-bags | Leather Bucket Bags \| FLORENCESS |
| /leather-clutches | /leather-clutches | category | /leather-clutches | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-clutches | Leather Clutches \| FLORENCESS |
| /leather-crossbody-bags | /leather-crossbody-bags | category | /leather-crossbody-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-crossbody-bags | Leather Crossbody Bags \| FLORENCESS |
| /leather-evening-bags | /leather-evening-bags | category | /leather-evening-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-evening-bags | Leather Evening Bags \| FLORENCESS |
| /leather-mini-micro-bags | /leather-mini-micro-bags | category | /leather-mini-micro-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-mini-micro-bags | Leather Mini + Micro Bags \| FLORENCESS |
| /leather-phone-crossbody | /leather-phone-crossbody | category | /leather-phone-crossbody | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-phone-crossbody | Leather Phone Crossbody \| FLORENCESS |
| /leather-shoulder-bags | /leather-shoulder-bags | category | /leather-shoulder-bags | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-shoulder-bags | Leather Shoulder Bags \| FLORENCESS |
| /leather-totes | /leather-totes | category | /leather-totes | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /leather-totes | Leather Totes \| FLORENCESS |
| /loafers | /loafers | category | /loafers | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /loafers | Loafers \| FLORENCESS |
| /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | product | /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | app/[slug]/page.tsx | detail captured | 200 | 200 /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | Lush Rush Come True Square Neck Velvet Long Sleeve \| FLORENCESS |
| /my-account.html | /login.html | account-alias | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount | 200 /account/login?returnTo=%2Faccount | Account Login \| FLORENCESS |
| /myth-tank-85799 | /myth-tank-85799 | product | /myth-tank-85799 | app/[slug]/page.tsx | detail captured | 200 | 200 /myth-tank-85799 | Myth Tank \| FLORENCESS |
| /new | /new | category | /new | app/[slug]/page.tsx | 13/13 pages | 200 | 200 /new | New \| FLORENCESS |
| /onda-pinch-high-rise-straight-85654 | /onda-pinch-high-rise-straight-85654 | product | /onda-pinch-high-rise-straight-85654 | app/[slug]/page.tsx | detail captured | 200 | 200 /onda-pinch-high-rise-straight-85654 | Onda Pinch High Rise Straight \| FLORENCESS |
| /order-history.html | /login.html | account-alias | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount%3Ftab%3Dorders | 200 /account/login?returnTo=%2Faccount%3Ftab%3Dorders | Account Login \| FLORENCESS |
| /order-tracking | /order-tracking | article | /order-tracking | app/[slug]/page.tsx | — | 200 | 200 /order-tracking | Order Tracking \| FLORENCESS |
| /palace-dawn-knit-tank-85811 | /palace-dawn-knit-tank-85811 | product | /palace-dawn-knit-tank-85811 | app/[slug]/page.tsx | detail captured | 200 | 200 /palace-dawn-knit-tank-85811 | Palace Dawn Knit Tank \| FLORENCESS |
| /pants-leggings | /pants-leggings | category | /pants-leggings | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /pants-leggings | Pants &amp; Leggings \| FLORENCESS |
| /payment-options | /payment-options | article | /payment-options | app/[slug]/page.tsx | — | 200 | 200 /payment-options | Payment Options \| FLORENCESS |
| /pearl-crochet-back-tank-86343 | /pearl-crochet-back-tank-86343 | product | /pearl-crochet-back-tank-86343 | app/[slug]/page.tsx | detail captured | 200 | 200 /pearl-crochet-back-tank-86343 | Pearl Crochet Back Tank \| FLORENCESS |
| /pixel-ruched-side-brushed-rib-v-neck-85856 | /pixel-ruched-side-brushed-rib-v-neck-85856 | product | /pixel-ruched-side-brushed-rib-v-neck-85856 | app/[slug]/page.tsx | detail captured | 200 | 200 /pixel-ruched-side-brushed-rib-v-neck-85856 | Pixel Ruched Side Brushed Rib V-Neck \| FLORENCESS |
| /privacy-policy | /privacy-policy | static | /privacy-policy | app/privacy-policy/page.tsx | — | 200 | 200 /privacy-policy | Privacy Policy \| FLORENCESS |
| /returns-exchanges | /returns-exchanges | article | /returns-exchanges | app/[slug]/page.tsx | — | 200 | 200 /returns-exchanges | Returns &amp; Exchanges \| FLORENCESS |
| /royal-dye-bodysuit-86013 | /royal-dye-bodysuit-86013 | product | /royal-dye-bodysuit-86013 | app/[slug]/page.tsx | detail captured | 200 | 200 /royal-dye-bodysuit-86013 | Royal Dye Bodysuit \| FLORENCESS |
| /rush-l-s-t | /rush-l-s-t | product | /rush-l-s-t | app/[slug]/page.tsx | detail captured | 200 | 200 /rush-l-s-t | Rush L/S T \| FLORENCESS |
| /sandals | /sandals | category | /sandals | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /sandals | Sandals \| FLORENCESS |
| /shipping-policy | /shipping-policy | static | /shipping-policy | app/shipping-policy/page.tsx | — | 200 | 200 /shipping-policy | Shipping Policy \| FLORENCESS |
| /shoes | /shoes | category | /shoes | app/[slug]/page.tsx | 4/4 pages | 200 | 200 /shoes | Shoes \| FLORENCESS |
| /smeraldo-rib-asymmetric-top-85972 | /smeraldo-rib-asymmetric-top-85972 | product | /smeraldo-rib-asymmetric-top-85972 | app/[slug]/page.tsx | detail captured | 200 | 200 /smeraldo-rib-asymmetric-top-85972 | Smeraldo Rib Asymmetric Top \| FLORENCESS |
| /spirit-one-shoulder-top-85906 | /spirit-one-shoulder-top-85906 | product | /spirit-one-shoulder-top-85906 | app/[slug]/page.tsx | detail captured | 200 | 200 /spirit-one-shoulder-top-85906 | Spirit One Shoulder Top \| FLORENCESS |
| /sweatshirts-sweatpants | /sweatshirts-sweatpants | category | /sweatshirts-sweatpants | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /sweatshirts-sweatpants | Sweatshirts &amp; Sweatpants \| FLORENCESS |
| /tanks-tees | /tanks-tees | category | /tanks-tees | app/[slug]/page.tsx | 1/1 pages | 200 | 200 /tanks-tees | Tanks &amp; Tees \| FLORENCESS |
| /terms-conditions | /terms-conditions | static | /terms-conditions | app/terms-conditions/page.tsx | — | 200 | 200 /terms-conditions | Terms &amp; Conditions \| FLORENCESS |
| /tops | /tops | category | /tops | app/[slug]/page.tsx | 3/3 pages | 200 | 200 /tops | Tops \| FLORENCESS |
| /vague-tee-86287 | /vague-tee-86287 | product | /vague-tee-86287 | app/[slug]/page.tsx | detail captured | 200 | 200 /vague-tee-86287 | Vague Tee \| FLORENCESS |
| /velluto-classique-ripped-85768 | /velluto-classique-ripped-85768 | product | /velluto-classique-ripped-85768 | app/[slug]/page.tsx | detail captured | 200 | 200 /velluto-classique-ripped-85768 | Velluto Classique Ripped \| FLORENCESS |
| /wishlist.html | /login.html | account-alias | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist | 200 /account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist | Account Login \| FLORENCESS |
| /faq | /faq | static | /faq | app/faq/page.tsx | — | 200 | 200 /faq | FAQ \| FLORENCESS |
| /index.php?route=information/contact | /index.php?route=information/contact | proxy | /contact | proxy.ts | — | 308 → /contact | 200 /contact | Contact Us \| FLORENCESS |
| /index.php?route=product/search | /index.php?route=product/search | proxy | /search | proxy.ts | — | 308 → /search | 200 /search | Search \| FLORENCESS |
| /index.php?route=product/special | /index.php?route=product/special | proxy | /special | proxy.ts | — | 308 → /special | 200 /special | Special Offers \| FLORENCESS |
| /index.php?route=product/manufacturer | /index.php?route=product/manufacturer | proxy | /brands | proxy.ts | — | 308 → /brands | 200 /brands | Brands \| FLORENCESS |
| /index.php?route=account/login | /index.php?route=account/login | proxy | /account/login | proxy.ts | — | 308 → /account/login | 200 /account/login | Account Login \| FLORENCESS |
| /index.php?route=account/wishlist | /index.php?route=account/wishlist | proxy | /account/login | proxy.ts | — | 302 → /account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist | 200 /account/login?returnTo=%2Faccount%3Funsupported%3Dwishlist | Account Login \| FLORENCESS |
| /index.php?route=checkout/checkout | /index.php?route=checkout/checkout | proxy | /checkout | proxy.ts | — | 308 → /checkout | 200 /checkout | FLORENCESS \| Affordable Online Shopping for Bags, Shoes &amp; Clothing |

## Flagged rows
- None under the chosen check; content, interactions and reference first-hop fidelity still require separate tests.
