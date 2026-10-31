# FLORENCESS route matrix

Inventory: 83 unique reference entries; route kinds: {"account-alias":5,"article":6,"category":25,"home":1,"product":32,"proxy":8,"static":6}.
Mode: static only; no server requests.
Inputs: 75 rows from `ref-page-status.json` plus eight live nonduplicate rows from `ref-extra-routes.json`. Reference `status` is a *followed* historical result; first-hop reference HTTP code is not recorded in these inputs.
Static/unmapped or runtime mismatches: 0.

| Reference | Ref final | Kind | Target | Static evidence | Capture | Local first hop | Local final | Local title / issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| / | / | home | / | app/page.tsx | — | — | — | — |
| /about-us | /about-us | static | /about-us | app/about-us/page.tsx | — | — | — | — |
| /account-voucher.html | /login.html | account-alias | /account/login | proxy.ts | — | — | — | — |
| /address-book.html | /login.html | account-alias | /account/login | proxy.ts | — | — | — | — |
| /affiliate-program | /affiliate-program | article | /affiliate-program | app/[slug]/page.tsx | — | — | — | — |
| /always-palazzo-jean-85651 | /always-palazzo-jean-85651 | product | /always-palazzo-jean-85651 | app/[slug]/page.tsx | detail captured | — | — | — |
| /amore-drift-ruffle-tank-85992 | /amore-drift-ruffle-tank-85992 | product | /amore-drift-ruffle-tank-85992 | app/[slug]/page.tsx | detail captured | — | — | — |
| /axiom-vibe-long-sleeve-top-85860 | /axiom-vibe-long-sleeve-top-85860 | product | /axiom-vibe-long-sleeve-top-85860 | app/[slug]/page.tsx | detail captured | — | — | — |
| /bags-all | /bags-all | category | /bags-all | app/[slug]/page.tsx | 3/3 pages | — | — | — |
| /ballet-flats | /ballet-flats | category | /ballet-flats | app/[slug]/page.tsx | 0/1 pages | — | — | — |
| /bastion-high-rise-shorts-85747 | /bastion-high-rise-shorts-85747 | product | /bastion-high-rise-shorts-85747 | app/[slug]/page.tsx | detail captured | — | — | — |
| /belleza-v-neck-tee-86346 | /belleza-v-neck-tee-86346 | product | /belleza-v-neck-tee-86346 | app/[slug]/page.tsx | detail captured | — | — | — |
| /boots | /boots | category | /boots | app/[slug]/page.tsx | 2/2 pages | — | — | — |
| /boundless-mid-rise-flare-in-coated-asphalt-85648 | /boundless-mid-rise-flare-in-coated-asphalt-85648 | product | /boundless-mid-rise-flare-in-coated-asphalt-85648 | app/[slug]/page.tsx | detail captured | — | — | — |
| /careers | /careers | article | /careers | app/[slug]/page.tsx | — | — | — | — |
| /castle-tank-86291 | /castle-tank-86291 | product | /castle-tank-86291 | app/[slug]/page.tsx | detail captured | — | — | — |
| /clothing | /clothing | category | /clothing | app/[slug]/page.tsx | 8/8 pages | — | — | — |
| /cookie-policy | /cookie-policy | static | /cookie-policy | app/cookie-policy/page.tsx | — | — | — | — |
| /crimson-allure-dye-high-rise-7-8-legging-86077 | /crimson-allure-dye-high-rise-7-8-legging-86077 | product | /crimson-allure-dye-high-rise-7-8-legging-86077 | app/[slug]/page.tsx | detail captured | — | — | — |
| /customer-rewards-program | /customer-rewards-program | article | /customer-rewards-program | app/[slug]/page.tsx | — | — | — | — |
| /denim | /denim | category | /denim | app/[slug]/page.tsx | 2/2 pages | — | — | — |
| /deseo-snap-henley-tee-86359 | /deseo-snap-henley-tee-86359 | product | /deseo-snap-henley-tee-86359 | app/[slug]/page.tsx | detail captured | — | — | — |
| /dresses | /dresses | category | /dresses | app/[slug]/page.tsx | 2/2 pages | — | — | — |
| /eclipse-pulse-knit-tank-85804 | /eclipse-pulse-knit-tank-85804 | product | /eclipse-pulse-knit-tank-85804 | app/[slug]/page.tsx | detail captured | — | — | — |
| /elite | /elite | product | /elite | app/[slug]/page.tsx | detail captured | — | — | — |
| /enchant-tone-crop-rib-tank-85967 | /enchant-tone-crop-rib-tank-85967 | product | /enchant-tone-crop-rib-tank-85967 | app/[slug]/page.tsx | detail captured | — | — | — |
| /facet-bloom-lace-top-85997 | /facet-bloom-lace-top-85997 | product | /facet-bloom-lace-top-85997 | app/[slug]/page.tsx | detail captured | — | — | — |
| /fina-vita-twist-crop-top-86268 | /fina-vita-twist-crop-top-86268 | product | /fina-vita-twist-crop-top-86268 | app/[slug]/page.tsx | detail captured | — | — | — |
| /final-few | /final-few | category | /final-few | app/[slug]/page.tsx | 0/1 pages | — | — | — |
| /fission-stella-crochet-detail-top-85837 | /fission-stella-crochet-detail-top-85837 | product | /fission-stella-crochet-detail-top-85837 | app/[slug]/page.tsx | detail captured | — | — | — |
| /fulgor-mini-dress-86131 | /fulgor-mini-dress-86131 | product | /fulgor-mini-dress-86131 | app/[slug]/page.tsx | detail captured | — | — | — |
| /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | product | /gasa-cielo-stretch-mesh-long-sleeve-top-85839 | app/[slug]/page.tsx | detail captured | — | — | — |
| /grazia-stile-dead-tee-86297 | /grazia-stile-dead-tee-86297 | product | /grazia-stile-dead-tee-86297 | app/[slug]/page.tsx | detail captured | — | — | — |
| /heels | /heels | category | /heels | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /immortal-girl-crop-flare-85618 | /immortal-girl-crop-flare-85618 | product | /immortal-girl-crop-flare-85618 | app/[slug]/page.tsx | detail captured | — | — | — |
| /index.php?route=checkout/cart | /index.php?route=checkout/cart | proxy | /cart | proxy.ts | — | — | — | — |
| /joya-wide-leg-jean-85624 | /joya-wide-leg-jean-85624 | product | /joya-wide-leg-jean-85624 | app/[slug]/page.tsx | detail captured | — | — | — |
| /leather-belt-bags | /leather-belt-bags | category | /leather-belt-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-bucket-bags | /leather-bucket-bags | category | /leather-bucket-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-clutches | /leather-clutches | category | /leather-clutches | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-crossbody-bags | /leather-crossbody-bags | category | /leather-crossbody-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-evening-bags | /leather-evening-bags | category | /leather-evening-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-mini-micro-bags | /leather-mini-micro-bags | category | /leather-mini-micro-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-phone-crossbody | /leather-phone-crossbody | category | /leather-phone-crossbody | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-shoulder-bags | /leather-shoulder-bags | category | /leather-shoulder-bags | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /leather-totes | /leather-totes | category | /leather-totes | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /loafers | /loafers | category | /loafers | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | product | /lush-rush-come-true-square-neck-velvet-long-sleeve-85857 | app/[slug]/page.tsx | detail captured | — | — | — |
| /my-account.html | /login.html | account-alias | /account/login | proxy.ts | — | — | — | — |
| /myth-tank-85799 | /myth-tank-85799 | product | /myth-tank-85799 | app/[slug]/page.tsx | detail captured | — | — | — |
| /new | /new | category | /new | app/[slug]/page.tsx | 13/13 pages | — | — | — |
| /onda-pinch-high-rise-straight-85654 | /onda-pinch-high-rise-straight-85654 | product | /onda-pinch-high-rise-straight-85654 | app/[slug]/page.tsx | detail captured | — | — | — |
| /order-history.html | /login.html | account-alias | /account/login | proxy.ts | — | — | — | — |
| /order-tracking | /order-tracking | article | /order-tracking | app/[slug]/page.tsx | — | — | — | — |
| /palace-dawn-knit-tank-85811 | /palace-dawn-knit-tank-85811 | product | /palace-dawn-knit-tank-85811 | app/[slug]/page.tsx | detail captured | — | — | — |
| /pants-leggings | /pants-leggings | category | /pants-leggings | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /payment-options | /payment-options | article | /payment-options | app/[slug]/page.tsx | — | — | — | — |
| /pearl-crochet-back-tank-86343 | /pearl-crochet-back-tank-86343 | product | /pearl-crochet-back-tank-86343 | app/[slug]/page.tsx | detail captured | — | — | — |
| /pixel-ruched-side-brushed-rib-v-neck-85856 | /pixel-ruched-side-brushed-rib-v-neck-85856 | product | /pixel-ruched-side-brushed-rib-v-neck-85856 | app/[slug]/page.tsx | detail captured | — | — | — |
| /privacy-policy | /privacy-policy | static | /privacy-policy | app/privacy-policy/page.tsx | — | — | — | — |
| /returns-exchanges | /returns-exchanges | article | /returns-exchanges | app/[slug]/page.tsx | — | — | — | — |
| /royal-dye-bodysuit-86013 | /royal-dye-bodysuit-86013 | product | /royal-dye-bodysuit-86013 | app/[slug]/page.tsx | detail captured | — | — | — |
| /rush-l-s-t | /rush-l-s-t | product | /rush-l-s-t | app/[slug]/page.tsx | detail captured | — | — | — |
| /sandals | /sandals | category | /sandals | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /shipping-policy | /shipping-policy | static | /shipping-policy | app/shipping-policy/page.tsx | — | — | — | — |
| /shoes | /shoes | category | /shoes | app/[slug]/page.tsx | 4/4 pages | — | — | — |
| /smeraldo-rib-asymmetric-top-85972 | /smeraldo-rib-asymmetric-top-85972 | product | /smeraldo-rib-asymmetric-top-85972 | app/[slug]/page.tsx | detail captured | — | — | — |
| /spirit-one-shoulder-top-85906 | /spirit-one-shoulder-top-85906 | product | /spirit-one-shoulder-top-85906 | app/[slug]/page.tsx | detail captured | — | — | — |
| /sweatshirts-sweatpants | /sweatshirts-sweatpants | category | /sweatshirts-sweatpants | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /tanks-tees | /tanks-tees | category | /tanks-tees | app/[slug]/page.tsx | 1/1 pages | — | — | — |
| /terms-conditions | /terms-conditions | static | /terms-conditions | app/terms-conditions/page.tsx | — | — | — | — |
| /tops | /tops | category | /tops | app/[slug]/page.tsx | 3/3 pages | — | — | — |
| /vague-tee-86287 | /vague-tee-86287 | product | /vague-tee-86287 | app/[slug]/page.tsx | detail captured | — | — | — |
| /velluto-classique-ripped-85768 | /velluto-classique-ripped-85768 | product | /velluto-classique-ripped-85768 | app/[slug]/page.tsx | detail captured | — | — | — |
| /wishlist.html | /login.html | account-alias | /account/login | proxy.ts | — | — | — | — |
| /faq | /faq | static | /faq | app/faq/page.tsx | — | — | — | — |
| /index.php?route=information/contact | /index.php?route=information/contact | proxy | /contact | proxy.ts | — | — | — | — |
| /index.php?route=product/search | /index.php?route=product/search | proxy | /search | proxy.ts | — | — | — | — |
| /index.php?route=product/special | /index.php?route=product/special | proxy | /special | proxy.ts | — | — | — | — |
| /index.php?route=product/manufacturer | /index.php?route=product/manufacturer | proxy | /brands | proxy.ts | — | — | — | — |
| /index.php?route=account/login | /index.php?route=account/login | proxy | /account/login | proxy.ts | — | — | — | — |
| /index.php?route=account/wishlist | /index.php?route=account/wishlist | proxy | /account/login | proxy.ts | — | — | — | — |
| /index.php?route=checkout/checkout | /index.php?route=checkout/checkout | proxy | /checkout | proxy.ts | — | — | — | — |

## Flagged rows
- None under the chosen check; content, interactions and reference first-hop fidelity still require separate tests.
