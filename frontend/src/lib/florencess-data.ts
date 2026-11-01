/**
 * Static content modelled on the FLORENCESS (entntnt.com) storefront.
 * Copy, navigation, banners and merchandising blocks are replicated 1:1 from
 * the live theme so the layout can be verified without hitting the origin.
 */

import { SITE_NAME } from "./brand";

export const FL_BRAND = SITE_NAME;

export const FL_TOPBAR_ITEMS = [
  "Orders $40+ Ship Free",
  "Shop Now. Pay it with Paypal & Bank Card",
  "Next Day Shipping On Select Sizes",
  "3–5 Days Delivery of USPS",
];

export interface FlNavColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface FlNavPromo {
  image: string;
  alt: string;
  title: string;
  href: string;
}

export interface FlNavGroup {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  /** When present the desktop navigation renders this group as a mega menu. */
  columns?: FlNavColumn[];
  promo?: FlNavPromo;
}

/**
 * Mega-menu columns for the three shop groups. Column titles are our own; the
 * links reuse the storefront's own category and listing pages. The promo images
 * currently borrow the local category art — 店主替换为自有图片 (store owner:
 * replace with your own imagery).
 */
const BAG_COLUMNS: FlNavColumn[] = [
  {
    title: "By Style",
    links: [
      { label: "Crossbody Bags", href: "/leather-crossbody-bags" },
      { label: "Totes", href: "/leather-totes" },
      { label: "Shoulder Bags", href: "/leather-shoulder-bags" },
      { label: "Belt Bags", href: "/leather-belt-bags" },
      { label: "Bucket Bags", href: "/leather-bucket-bags" },
      { label: "Clutches", href: "/leather-clutches" },
      { label: "Evening Bags", href: "/leather-evening-bags" },
      { label: "Mini Bags", href: "/leather-mini-micro-bags" },
      { label: "Phone Crossbody", href: "/leather-phone-crossbody" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "New Arrivals", href: "/new" },
      { label: "Sale Styles", href: "/special" },
      { label: "All Bags", href: "/bags-all" },
    ],
  },
];

const SHOE_COLUMNS: FlNavColumn[] = [
  {
    title: "By Style",
    links: [
      { label: "Ballet Flats", href: "/ballet-flats" },
      { label: "Sandals", href: "/sandals" },
      { label: "Loafers", href: "/loafers" },
      { label: "Heels", href: "/heels" },
      { label: "Boots", href: "/boots" },
      { label: "Final Few", href: "/final-few" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "New Arrivals", href: "/new" },
      { label: "Sale Styles", href: "/special" },
      { label: "All Shoes", href: "/shoes" },
    ],
  },
];

const CLOTHING_COLUMNS: FlNavColumn[] = [
  {
    title: "By Type",
    links: [
      { label: "Denim", href: "/denim" },
      { label: "Tops", href: "/tops" },
      { label: "Pants & Leggings", href: "/pants-leggings" },
      { label: "Dresses", href: "/dresses" },
      { label: "Sweatshirts & Sweatpants", href: "/sweatshirts-sweatpants" },
      { label: "Tanks & Tees", href: "/tanks-tees" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "New Arrivals", href: "/new" },
      { label: "Sale Styles", href: "/special" },
      { label: "All Clothing", href: "/clothing" },
    ],
  },
];

export const FL_NAV: FlNavGroup[] = [
  { label: "NEW", href: "/new" },
  {
    label: "BAGS",
    href: "/bags-all",
    children: [
      { label: "Crossbody Bags", href: "/leather-crossbody-bags" },
      { label: "Totes", href: "/leather-totes" },
      { label: "Shoulder Bags", href: "/leather-shoulder-bags" },
      { label: "Belt Bags", href: "/leather-belt-bags" },
      { label: "Bucket Bags", href: "/leather-bucket-bags" },
      { label: "Clutches", href: "/leather-clutches" },
      { label: "Evening Bags", href: "/leather-evening-bags" },
      { label: "Mini Bags", href: "/leather-mini-micro-bags" },
      { label: "Phone Crossbody", href: "/leather-phone-crossbody" },
    ],
    columns: BAG_COLUMNS,
    // 店主替换为自有图片 (store owner: replace with your own imagery).
    promo: {
      image: "/florencess/img/cat-1.webp",
      alt: "Crossbody bag campaign image",
      title: "Carry-All Edit",
      href: "/leather-crossbody-bags",
    },
  },
  {
    label: "SHOES",
    href: "/shoes",
    children: [
      { label: "Ballet Flats", href: "/ballet-flats" },
      { label: "Sandals", href: "/sandals" },
      { label: "Loafers", href: "/loafers" },
      { label: "Heels", href: "/heels" },
      { label: "Boots", href: "/boots" },
      { label: "Final Few", href: "/final-few" },
    ],
    columns: SHOE_COLUMNS,
    // 店主替换为自有图片 (store owner: replace with your own imagery).
    promo: {
      image: "/florencess/img/cat-8.webp",
      alt: "Shoes campaign image",
      title: "Step Into New",
      href: "/shoes",
    },
  },
  {
    label: "CLOTHING",
    href: "/clothing",
    children: [
      { label: "Denim", href: "/denim" },
      { label: "Tops", href: "/tops" },
      { label: "Pants & Leggings", href: "/pants-leggings" },
      { label: "Dresses", href: "/dresses" },
      { label: "Sweatshirts & Sweatpants", href: "/sweatshirts-sweatpants" },
      { label: "Tanks & Tees", href: "/tanks-tees" },
    ],
    columns: CLOTHING_COLUMNS,
    // 店主替换为自有图片 (store owner: replace with your own imagery).
    promo: {
      image: "/florencess/img/cat-7.webp",
      alt: "Dresses campaign image",
      title: "Dress The Season",
      href: "/dresses",
    },
  },
  { label: "SALE", href: "/special" },
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
      { label: "Women", href: "/new" },
      { label: "Men", href: "/new" },
    ],
  },
  {
    image: "/florencess/img/hero-936.webp",
    alt: "The warehouse sale, up to 60% off",
    variant: "warehouse",
    lines: ["THE WAREHOUSE SALE"],
    subline: "UP TO 60% OFF | NEW ADDITIONS | FINAL REDUCTIONS",
    links: [
      { label: "Women", href: "/new" },
      { label: "Men", href: "/new" },
      { label: "Sale", href: "/special" },
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
  { kicker: "SF26", title: "BAGS", image: "/florencess/img/hero-1.webp", href: "/bags-all", wide: true },
  { kicker: "WE LOVE", title: "SHOES", image: "/florencess/img/cat-8.webp", href: "/shoes" },
  { kicker: "WOMEN | SALE", title: "DRESSES", image: "/florencess/img/cat-7.webp", href: "/dresses" },
  { kicker: "WOMEN | SALE", title: "EVENING BAGS", image: "/florencess/img/cat-4.webp", href: "/leather-evening-bags" },
  { title: "WEAR WHAT SPEAKS TO YOU", image: "/florencess/img/wide-1.webp", href: "/new", wide: true },
  { title: "CROSSBODY", image: "/florencess/img/cat-1.webp", href: "/leather-crossbody-bags" },
  { title: "SHOP THE JOURNEY", image: "/florencess/img/cat-2.webp", href: "/new" },
  { kicker: "WOMEN | SALE", title: "TOPS", image: "/florencess/img/cat-3.webp", href: "/tops" },
  { kicker: "WOMEN | SALE", title: "WORLD OF HEELS", image: "/florencess/img/cat-5.webp", href: "/heels", wide: true },
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
      { label: "New", href: "/new" },
      { label: "Bags", href: "/bags-all" },
      { label: "Shoes", href: "/shoes" },
      { label: "Clothing", href: "/clothing" },
      { label: "Sale", href: "/special" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Account", href: "/account" },
      { label: "My Orders", href: "/order-history.html" },
      { label: "Gift Vouchers", href: "/account-voucher.html" },
      { label: "Address Book", href: "/address-book.html" },
      { label: "Login", href: "/account/login" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Shipping Policy", href: "/shipping-policy" },
      { label: "Returns & Exchanges", href: "/returns-exchanges" },
      { label: "Payment Options", href: "/payment-options" },
      { label: "Order Tracking", href: "/order-tracking" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", href: "/about-us" },
      { label: "Careers", href: "/careers" },
      { label: "Affiliate Program", href: "/affiliate-program" },
      { label: "Customer Rewards", href: "/customer-rewards-program" },
      { label: "Cookie Policy", href: "/cookie-policy" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-conditions" },
    ],
  },
];

export const FL_LOCALES = [
  { flag: "\u{1F1FA}\u{1F1F8}", country: "United States", currency: "USD ($)" },
  { flag: "\u{1F1EC}\u{1F1E7}", country: "United Kingdom", currency: "GBP (\u00A3)" },
  { flag: "\u{1F1EA}\u{1F1FA}", country: "European Union", currency: "EUR (\u20AC)" },
  { flag: "\u{1F1E9}\u{1F1EA}", country: "Germany", currency: "EUR (\u20AC)" },
  { flag: "\u{1F1EB}\u{1F1F7}", country: "France", currency: "EUR (\u20AC)" },
  { flag: "\u{1F1E8}\u{1F1E6}", country: "Canada", currency: "CAD ($)" },
  { flag: "\u{1F1E6}\u{1F1FA}", country: "Australia", currency: "AUD ($)" },
];

export const FL_RECENT_PURCHASES = [
  { name: "Sarah Martinez", country: "United States", product: "Tulipe Rush Crossbody", time: "Oct 29, 10:55" },
  { name: "Emily Carter", country: "United Kingdom", product: "Apex Stella Dress", time: "Oct 29, 10:41" },
  { name: "Olivia Brown", country: "Canada", product: "Palace Dawn Knit Tank", time: "Oct 29, 10:22" },
  { name: "Mia Wilson", country: "Australia", product: "Organza Denim Top", time: "Oct 29, 09:58" },
];
