/**
 * Static content modelled on the FLORENCESS (entntnt.com) storefront.
 * Copy, navigation, banners and merchandising blocks are replicated 1:1 from
 * the live theme so the layout can be verified without hitting the origin.
 */

export const FL_BRAND = "FLORENCESS";

export const FL_TOPBAR_ITEMS = [
  "Orders $40+ Ship Free",
  "Shop Now. Pay it with Paypal & Bank Card",
  "Next Day Shipping On Select Sizes",
  "3–5 Days Delivery of USPS",
];

export interface FlNavGroup {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

export const FL_NAV: FlNavGroup[] = [
  { label: "NEW", href: "/shop" },
  {
    label: "BAGS",
    href: "/shop",
    children: [
      { label: "Crossbody Bags", href: "/shop" },
      { label: "Totes", href: "/shop" },
      { label: "Shoulder Bags", href: "/shop" },
      { label: "Belt Bags", href: "/shop" },
      { label: "Bucket Bags", href: "/shop" },
      { label: "Clutches", href: "/shop" },
      { label: "Evening Bags", href: "/shop" },
      { label: "Mini Bags", href: "/shop" },
      { label: "Phone Crossbody", href: "/shop" },
    ],
  },
  {
    label: "SHOES",
    href: "/shop",
    children: [
      { label: "Ballet Flats", href: "/shop" },
      { label: "Sandals", href: "/shop" },
      { label: "Loafers", href: "/shop" },
      { label: "Heels", href: "/shop" },
      { label: "Boots", href: "/shop" },
      { label: "Final Few", href: "/shop" },
    ],
  },
  {
    label: "CLOTHING",
    href: "/shop",
    children: [
      { label: "Denim", href: "/shop" },
      { label: "Tops", href: "/shop" },
      { label: "Pants & Leggings", href: "/shop" },
      { label: "Dresses", href: "/shop" },
      { label: "Sweatshirts & Sweatpants", href: "/shop" },
      { label: "Tanks & Tees", href: "/shop" },
    ],
  },
  { label: "SALE", href: "/shop" },
];

export type FlHeroLink = { label: string; href: string };

export type FlHeroSlide = {
  image: string;
  alt: string;
  /**
   * `collections` —?two equal-size lines (second one bold) over two pill
   * buttons; `warehouse` —?one oversized pale headline, a thin subline and
   * pipe-separated text links. The reference really does use two different
   * layouts for its two hero slides.
   */
  variant: "collections" | "warehouse";
  lines: string[];
  subline?: string;
  links: FlHeroLink[];
};

/**
 * Reference hero = 2 slides (937 then 936), fade transition, no arrows and no
 * pagination dots. Copy is laid out per slide and is hidden entirely below the
 * desktop breakpoint (the mobile slider renders the image only).
 */
export const FL_HERO_SLIDES: FlHeroSlide[] = [
  {
    image: "/florencess/img/hero-937.webp",
    alt: "Spring/Summer 26 new collections",
    variant: "collections",
    lines: ["SPRING/SUMMER 26", "NEW COLLECTIONS"],
    links: [
      { label: "Women", href: "/shop" },
      { label: "Men", href: "/shop" },
    ],
  },
  {
    image: "/florencess/img/hero-936.webp",
    alt: "The warehouse sale, up to 60% off",
    variant: "warehouse",
    lines: ["THE WAREHOUSE SALE"],
    subline: "UP TO 60% OFF | NEW ADDITIONS | FINAL REDUCTIONS",
    links: [
      { label: "Women", href: "/shop" },
      { label: "Men", href: "/shop" },
      { label: "Sale", href: "/shop" },
    ],
  },
];

export const FL_USP = [
  "WHO WE ARE",
  "FIVESTAR EXPERIENCE",
  "FREE SHIPPING*",
  "EASY RETURNS",
  "PRICES INCLUDE DUTIES",
];

export interface FlTile {
  title: string;
  kicker?: string;
  meta?: string;
  image: string;
  href: string;
  wide?: boolean;
}

/**
 * Homepage mosaic (grid-row-top-28): a gapless 4-column grid where the wide
 * tiles span two cells. The reference cycles the wide cell through the row —? * first, middle, last —?which the order below reproduces.
 */
export const FL_TILES: FlTile[] = [
  { kicker: "SF26", title: "BAGS", image: "/florencess/img/hero-1.webp", href: "/shop", wide: true },
  { kicker: "WE LOVE", title: "SHOES", image: "/florencess/img/cat-8.webp", href: "/shop" },
  { kicker: "WOMEN | SALE", title: "DRESSES", image: "/florencess/img/cat-7.webp", href: "/shop" },
  { kicker: "WOMEN | SALE", title: "EVENING BAGS", image: "/florencess/img/cat-4.webp", href: "/shop" },
  { title: "WEAR WHAT SPEAKS TO YOU", image: "/florencess/img/wide-1.webp", href: "/shop", wide: true },
  { title: "CROSSBODY", image: "/florencess/img/cat-1.webp", href: "/shop" },
  { title: "SHOP THE JOURNEY", image: "/florencess/img/cat-2.webp", href: "/shop" },
  { kicker: "WOMEN | SALE", title: "TOPS", image: "/florencess/img/cat-3.webp", href: "/shop" },
  { kicker: "WOMEN | SALE", title: "WORLD OF HEELS", image: "/florencess/img/cat-5.webp", href: "/shop", wide: true },
];

/** Reference order from the homepage social row: FACEBOOK | INSTAGRAM | TWITTER | PINTEREST. */
export const FL_SOCIALS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Pinterest", href: "#" },
];

export const FL_FOOTER_COLUMNS = [
  {
    title: "Categories",
    links: [
      { label: "New", href: "/shop" },
      { label: "Bags", href: "/shop" },
      { label: "Shoes", href: "/shop" },
      { label: "Clothing", href: "/shop" },
      { label: "Sale", href: "/shop" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "My Orders", href: "/account" },
      { label: "Gift Vouchers", href: "/account" },
      { label: "Address Book", href: "/account" },
      { label: "Login For More Functions", href: "/account" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping Policy", href: "/shipping-policy" },
      { label: "Returns", href: "/returns" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
      { label: "Track Order", href: "/order/lookup" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Special Offers", href: "/shop" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-conditions" },
    ],
  },
];

export const FL_LOCALES = [
  { flag: "馃嚭馃嚫", country: "United States", currency: "USD ($)" },
  { flag: "馃嚞馃嚙", country: "United Kingdom", currency: "GBP (拢)" },
  { flag: "馃嚜馃嚭", country: "European Union", currency: "EUR (鈧?" },
  { flag: "馃嚛馃嚜", country: "Germany", currency: "EUR (鈧?" },
  { flag: "馃嚝馃嚪", country: "France", currency: "EUR (鈧?" },
  { flag: "馃嚚馃嚘", country: "Canada", currency: "CAD ($)" },
  { flag: "馃嚘馃嚭", country: "Australia", currency: "AUD ($)" },
];

export const FL_RECENT_PURCHASES = [
  { name: "Sarah Martinez", country: "United States", product: "Tulipe Rush Crossbody", time: "Oct 29, 10:55" },
  { name: "Emily Carter", country: "United Kingdom", product: "Apex Stella Dress", time: "Oct 29, 10:41" },
  { name: "Olivia Brown", country: "Canada", product: "Palace Dawn Knit Tank", time: "Oct 29, 10:22" },
  { name: "Mia Wilson", country: "Australia", product: "Organza Denim Top", time: "Oct 29, 09:58" },
];
