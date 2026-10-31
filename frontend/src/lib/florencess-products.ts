export interface FlorencessProduct {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  discount: string;
  image: string;
  imageAlt: string;
  href: string;
}

/**
 * Homepage shelf "WAREHOUSE SALE FOR $9.99" — the 16 products the reference
 * renders in grid-row-top-26, in the same order, with the struck-through
 * original prices it shows.
 */
export const FL_SALE_PRODUCTS: FlorencessProduct[] = [
  { id: "enchant-tone-crop-rib-tank-85967", name: "Enchant Tone Crop Rib Tank", price: "$9.99", oldPrice: "$54.47", discount: "-82%", image: "/florencess/img/p13a.webp", imageAlt: "/florencess/img/p13b.webp", href: "/enchant-tone-crop-rib-tank-85967" },
  { id: "smeraldo-rib-asymmetric-top-85972", name: "Smeraldo Rib Asymmetric Top", price: "$9.99", oldPrice: "$53.40", discount: "-81%", image: "/florencess/img/p14a.webp", imageAlt: "/florencess/img/p14b.webp", href: "/smeraldo-rib-asymmetric-top-85972" },
  { id: "gasa-cielo-stretch-mesh-long-sleeve-top-85839", name: "Gasa Cielo Stretch Mesh Long Sleeve Top", price: "$9.99", oldPrice: "$70.95", discount: "-86%", image: "/florencess/img/p15a.webp", imageAlt: "/florencess/img/p15b.webp", href: "/gasa-cielo-stretch-mesh-long-sleeve-top-85839" },
  { id: "belleza-v-neck-tee-86346", name: "Belleza V Neck Tee", price: "$9.99", oldPrice: "$59.94", discount: "-83%", image: "/florencess/img/p16a.webp", imageAlt: "/florencess/img/p16b.webp", href: "/belleza-v-neck-tee-86346" },
  { id: "myth-tank-85799", name: "Myth Tank", price: "$9.99", oldPrice: "$55.00", discount: "-82%", image: "/florencess/img/p01a.webp", imageAlt: "/florencess/img/p01b.webp", href: "/myth-tank-85799" },
  { id: "rush-l-s-t", name: "Rush L/S T", price: "$9.99", oldPrice: "$71.97", discount: "-86%", image: "/florencess/img/p02a.webp", imageAlt: "/florencess/img/p02b.webp", href: "/rush-l-s-t" },
  { id: "boundless-mid-rise-flare-in-coated-asphalt-85648", name: "Boundless Mid Rise Flare in Coated Asphalt", price: "$9.99", oldPrice: "$61.98", discount: "-84%", image: "/florencess/img/p03a.webp", imageAlt: "/florencess/img/p03b.webp", href: "/boundless-mid-rise-flare-in-coated-asphalt-85648" },
  { id: "deseo-snap-henley-tee-86359", name: "Deseo Snap Henley Tee", price: "$9.99", oldPrice: "$80.00", discount: "-88%", image: "/florencess/img/p04a.webp", imageAlt: "/florencess/img/p04b.webp", href: "/deseo-snap-henley-tee-86359" },
  { id: "pearl-crochet-back-tank-86343", name: "Pearl Crochet Back Tank", price: "$9.99", oldPrice: "$55.00", discount: "-82%", image: "/florencess/img/p05a.webp", imageAlt: "/florencess/img/p05b.webp", href: "/pearl-crochet-back-tank-86343" },
  { id: "fission-stella-crochet-detail-top-85837", name: "Fission Stella Crochet Detail Top", price: "$9.99", oldPrice: "$70.95", discount: "-86%", image: "/florencess/img/p06a.webp", imageAlt: "/florencess/img/p06b.webp", href: "/fission-stella-crochet-detail-top-85837" },
  { id: "velluto-classique-ripped-85768", name: "Velluto Classique Ripped", price: "$9.99", oldPrice: "$61.98", discount: "-84%", image: "/florencess/img/p07a.webp", imageAlt: "/florencess/img/p07b.webp", href: "/velluto-classique-ripped-85768" },
  { id: "elite", name: "Elite", price: "$9.99", oldPrice: "$70.95", discount: "-86%", image: "/florencess/img/p08a.webp", imageAlt: "/florencess/img/p08b.webp", href: "/elite" },
  { id: "lush-rush-come-true-square-neck-velvet-long-sleeve-85857", name: "Lush Rush Come True Square Neck Velvet Long Sleeve", price: "$9.99", oldPrice: "$70.95", discount: "-86%", image: "/florencess/img/p09a.webp", imageAlt: "/florencess/img/p09b.webp", href: "/lush-rush-come-true-square-neck-velvet-long-sleeve-85857" },
  { id: "castle-tank-86291", name: "Castle Tank", price: "$9.99", oldPrice: "$55.00", discount: "-82%", image: "/florencess/img/p10a.webp", imageAlt: "/florencess/img/p10b.webp", href: "/castle-tank-86291" },
  { id: "palace-dawn-knit-tank-85811", name: "Palace Dawn Knit Tank", price: "$9.99", oldPrice: "$70.95", discount: "-86%", image: "/florencess/img/p11a.webp", imageAlt: "/florencess/img/p11b.webp", href: "/palace-dawn-knit-tank-85811" },
  { id: "royal-dye-bodysuit-86013", name: "Royal Dye Bodysuit", price: "$9.99", oldPrice: "$55.27", discount: "-82%", image: "/florencess/img/p12a.webp", imageAlt: "/florencess/img/p12b.webp", href: "/royal-dye-bodysuit-86013" },
];

/**
 * Homepage shelf "YOU MAY ALSO LIKE" — the 16 products the reference renders
 * in grid-row-top-32, at full price (no discount label).
 */
export const FL_ALSO_PRODUCTS: FlorencessProduct[] = [
  { id: "facet-bloom-lace-top-85997", name: "Facet Bloom Lace Top", price: "$98.90", oldPrice: "", discount: "", image: "/florencess/img/p29a.webp", imageAlt: "/florencess/img/p29b.webp", href: "/facet-bloom-lace-top-85997" },
  { id: "axiom-vibe-long-sleeve-top-85860", name: "Axiom Vibe Long Sleeve Top", price: "$49.95", oldPrice: "", discount: "", image: "/florencess/img/p30a.webp", imageAlt: "/florencess/img/p30b.webp", href: "/axiom-vibe-long-sleeve-top-85860" },
  { id: "joya-wide-leg-jean-85624", name: "Joya Wide Leg Jean", price: "$99.90", oldPrice: "", discount: "", image: "/florencess/img/p31a.webp", imageAlt: "/florencess/img/p31b.webp", href: "/joya-wide-leg-jean-85624" },
  { id: "onda-pinch-high-rise-straight-85654", name: "Onda Pinch High Rise Straight", price: "$25.97", oldPrice: "", discount: "", image: "/florencess/img/p32a.webp", imageAlt: "/florencess/img/p32b.webp", href: "/onda-pinch-high-rise-straight-85654" },
  { id: "fina-vita-twist-crop-top-86268", name: "Fina Vita Twist Crop Top", price: "$30.99", oldPrice: "", discount: "", image: "/florencess/img/p17a.webp", imageAlt: "/florencess/img/p17b.webp", href: "/fina-vita-twist-crop-top-86268" },
  { id: "pixel-ruched-side-brushed-rib-v-neck-85856", name: "Pixel Ruched Side Brushed Rib V-Neck", price: "$29.97", oldPrice: "", discount: "", image: "/florencess/img/p18a.webp", imageAlt: "/florencess/img/p18b.webp", href: "/pixel-ruched-side-brushed-rib-v-neck-85856" },
  { id: "crimson-allure-dye-high-rise-7-8-legging-86077", name: "Crimson Allure Dye High Rise 7/8 Legging", price: "$84.00", oldPrice: "", discount: "", image: "/florencess/img/p19a.webp", imageAlt: "/florencess/img/p19b.webp", href: "/crimson-allure-dye-high-rise-7-8-legging-86077" },
  { id: "spirit-one-shoulder-top-85906", name: "Spirit One Shoulder Top", price: "$69.93", oldPrice: "", discount: "", image: "/florencess/img/p20a.webp", imageAlt: "/florencess/img/p20b.webp", href: "/spirit-one-shoulder-top-85906" },
  { id: "grazia-stile-dead-tee-86297", name: "Grazia Stile Dead Tee", price: "$30.99", oldPrice: "", discount: "", image: "/florencess/img/p21a.webp", imageAlt: "/florencess/img/p21b.webp", href: "/grazia-stile-dead-tee-86297" },
  { id: "immortal-girl-crop-flare-85618", name: "Immortal Girl Crop Flare", price: "$98.00", oldPrice: "", discount: "", image: "/florencess/img/p22a.webp", imageAlt: "/florencess/img/p22b.webp", href: "/immortal-girl-crop-flare-85618" },
  { id: "amore-drift-ruffle-tank-85992", name: "Amore Drift Ruffle Tank", price: "$49.95", oldPrice: "", discount: "", image: "/florencess/img/p23a.webp", imageAlt: "/florencess/img/p23b.webp", href: "/amore-drift-ruffle-tank-85992" },
  { id: "eclipse-pulse-knit-tank-85804", name: "Eclipse Pulse Knit Tank", price: "$49.95", oldPrice: "", discount: "", image: "/florencess/img/p24a.webp", imageAlt: "/florencess/img/p24b.webp", href: "/eclipse-pulse-knit-tank-85804" },
  { id: "always-palazzo-jean-85651", name: "Always Palazzo Jean", price: "$79.92", oldPrice: "", discount: "", image: "/florencess/img/p25a.webp", imageAlt: "/florencess/img/p25b.webp", href: "/always-palazzo-jean-85651" },
  { id: "vague-tee-86287", name: "Vague Tee", price: "$25.97", oldPrice: "", discount: "", image: "/florencess/img/p26a.webp", imageAlt: "/florencess/img/p26b.webp", href: "/vague-tee-86287" },
  { id: "bastion-high-rise-shorts-85747", name: "Bastion High Rise Shorts", price: "$89.91", oldPrice: "", discount: "", image: "/florencess/img/p27a.webp", imageAlt: "/florencess/img/p27b.webp", href: "/bastion-high-rise-shorts-85747" },
  { id: "fulgor-mini-dress-86131", name: "Fulgor Mini Dress", price: "$99.90", oldPrice: "", discount: "", image: "/florencess/img/p28a.webp", imageAlt: "/florencess/img/p28b.webp", href: "/fulgor-mini-dress-86131" },
];

export const FLORENCESS_PRODUCTS: FlorencessProduct[] = [
  ...FL_SALE_PRODUCTS,
  ...FL_ALSO_PRODUCTS,
];
