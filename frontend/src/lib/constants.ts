import { STUDIO, STUDIO_CHAT_INSTRUCTION, STUDIO_CHAT_INSTRUCTION_OPEN, collectionsUrl } from "./studio-content";

// --- TYPES ---
export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  description: string;
  details: string;
  material: string;
  images: string[];
  videoUrl?: string;
  variants?: { id: string; name: string; colorCode: string }[];
  isBestSeller?: boolean;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
}

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "image"; src: string; caption: string }
  | { type: "heading"; text: string; level?: number }
  | { type: "list"; items: string[] }
  | { type: "inline-product"; productId: string; context: string };

export interface Article {
  id: number;
  slug: string;
  category: string;
  title: string;
  author?: string;
  date?: string;
  excerpt: string;
  image: string;
  readTime: string;
  content?: ArticleBlock[];
  relatedArticleIds?: number[];
  featuredProductId?: string;
}

// --- CONSTANTS ---

export const COMPANY_INFO = {
  name: "Cansoria Studio",
  supportEmail: "hello@cansoria.com",
  address: "Independent watch studio in preparation",
  studioNote: STUDIO.readiness,
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Heritage Classic 40",
    subtitle: STUDIO.productSubtitle,
    category: "Dress Watches",
    price: 309,
    rating: 0,
    reviewCount: 0,
    description: STUDIO.productDescription,
    details: STUDIO.readiness,
    material: "To be confirmed",
    images: ["/products/watch.svg"],
  },
  {
    id: "p2",
    name: "Meridian Automatic",
    subtitle: STUDIO.productSubtitle,
    category: "Automatic",
    price: 429,
    rating: 0,
    reviewCount: 0,
    description: STUDIO.productDescription,
    details: STUDIO.readiness,
    material: "To be confirmed",
    images: ["/products/watch.svg"],
  },
];

export const ARTICLES: Article[] = [
  {
    id: 1,
    slug: "automatic-vs-quartz-which-watch-movement-is-right-for-you",
    category: "Watch Basics",
    title: "Automatic vs Quartz: Which Watch Movement Is Right for You?",
    author: "The Cansoria Journal",
    date: "Feb 4, 2026",
    excerpt:
      "Understand the difference between automatic and quartz movements so you can choose the watch that fits how you actually wear it.",
    image: "/products/watch.svg",
    readTime: "5 min read",
    featuredProductId: "p2",
    relatedArticleIds: [2, 4],
    content: [
      {
        type: "paragraph",
        text: "A watch movement is its heart. Automatic movements store energy from the motion of your wrist, while quartz movements draw precise timekeeping from a battery and a vibrating crystal.",
      },
      {
        type: "heading",
        level: 2,
        text: "Choose automatic for craft and character",
      },
      {
        type: "paragraph",
        text: "An automatic watch has no battery to replace. The seconds hand sweeps, the movement stays visible through an exhibition caseback, and a full wind keeps time through the weekend. It suits wearers who enjoy the ritual of a mechanical object.",
      },
      {
        type: "paragraph",
        text: "Quartz suits wearers who want to pick up the watch and go: months of accuracy on one battery, thinner cases, and lower prices for the same finish.",
      },
      {
        type: "image",
        src: "/products/watch.svg",
        caption:
          "An exhibition caseback shows the rotor and balance wheel of an automatic movement.",
      },
    ],
  },
  {
    id: 2,
    slug: "how-to-choose-the-right-watch-case-size",
    category: "Buying Guide",
    title: "How to Choose the Right Watch Case Size",
    author: "The Cansoria Journal",
    date: "Feb 10, 2026",
    excerpt:
      "Wrist size, strap style and dial layout all change how a case sits. Use this guide to pick between 36, 38, 40 and 42mm.",
    image: "/products/watch.svg",
    readTime: "6 min read",
    relatedArticleIds: [1, 5],
    content: [
      {
        type: "paragraph",
        text: "Case size is the single biggest factor in how a watch wears. Two watches with the same diameter can wear differently depending on lug-to-lug length, dial colour and strap choice.",
      },
      {
        type: "paragraph",
        text: "As a starting point, wrists under 16cm suit 36–38mm cases, 16–18cm wrists suit 38–40mm, and larger wrists carry 40–42mm with presence. Measure around the bone of your wrist with a soft tape.",
      },
      {
        type: "blockquote",
        text: "A watch should sit flat on the wrist with the lugs not overhanging either edge. When in doubt, size down.",
      },
      {
        type: "list",
        items: [
          "36mm wears vintage and disappears under a cuff.",
          "38–40mm is the versatile middle for most wrists.",
          "42mm suits dive and chronograph styles with visual weight.",
        ],
      },
    ],
  },
  {
    id: 3,
    slug: "how-to-care-for-a-leather-watch-strap",
    category: "Care",
    title: "How to Care for a Leather Watch Strap",
    author: "The Cansoria Journal",
    date: "Feb 18, 2026",
    excerpt:
      "A leather strap ages beautifully with a few simple habits: rotation, drying, cleaning and knowing when to retire it.",
    image: "/products/watch.svg",
    readTime: "4 min read",
    relatedArticleIds: [2, 6],
    content: [
      {
        type: "paragraph",
        text: "A leather strap is the fastest way to change a watch's character — and the first part to show wear. With a little care it develops a patina instead of cracking.",
      },
      {
        type: "paragraph",
        text: "Rotate between straps when you can, let the strap dry naturally after rain or sweat, and wipe the lining with a dry cloth at the end of the day. Avoid direct heat, prolonged sun and perfume contact.",
      },
      {
        type: "paragraph",
        text: "When a strap loses its shape, smells even after cleaning, or the holes stretch out, replace it. Quick-release spring bars make a strap swap a no-tools, one-minute job.",
      },
    ],
  },
  {
    id: 4,
    slug: "water-resistance-ratings-explained",
    category: "Watch Basics",
    title: "Water Resistance Ratings Explained: 3, 5, 10 and 20 ATM",
    author: "The Cansoria Journal",
    date: "Feb 24, 2026",
    excerpt:
      "What ATM really means, which rating handles swimming and diving, and why you should never press a crown underwater.",
    image: "/products/watch.svg",
    readTime: "5 min read",
    relatedArticleIds: [1, 5],
    content: [
      {
        type: "paragraph",
        text: "Water resistance is measured in atmospheres (ATM), where each ATM is roughly ten metres of static pressure. Real-world water impact is more demanding than the lab, so ratings include a safety margin.",
      },
      {
        type: "heading",
        level: 2,
        text: "Which rating fits your life",
      },
      {
        type: "list",
        items: [
          "3 ATM — splashes and rain; remove before washing up.",
          "5 ATM — shower-free daily wear and light splashes.",
          "10 ATM — swimming and pool holidays.",
          "20 ATM — recreational diving with a rotating bezel.",
        ],
      },
      {
        type: "paragraph",
        text: "Never operate a crown or pusher underwater: it breaks the seal exactly when water pressure is highest. After salt water, rinse a dive watch in fresh water and dry the crown area.",
      },
    ],
  },
  {
    id: 5,
    slug: "engraved-watch-gift-ideas",
    category: "Gift Ideas",
    title: "Engraved Watch Gift Ideas: Words That Stay",
    author: "The Cansoria Journal",
    date: "Mar 3, 2026",
    excerpt:
      "An engraved caseback turns a watch into a keepsake. Ideas and rules of thumb for the twenty characters that matter.",
    image: "/products/watch.svg",
    readTime: "5 min read",
    featuredProductId: "p1",
    relatedArticleIds: [1, 4],
    content: [
      {
        type: "paragraph",
        text: "A watch is already a personal gift. An engraved caseback makes it singular: the words are hidden in daily wear and discovered every time the watch is taken off.",
      },
      {
        type: "paragraph",
        text: "Twenty characters is shorter than you think — it fits initials and a date (\"J & M — 2026\"), a coordinate pair, or a single word that only the wearer understands. Pick words that will still mean something in ten years.",
      },
      {
        type: "blockquote",
        text: "Engrave the occasion, not the trend. Dates and initials outlast phrases.",
      },
    ],
  },
  {
    id: 6,
    slug: "how-to-style-a-dress-watch",
    category: "Style Guide",
    title: "How to Style a Dress Watch",
    author: "The Cansoria Journal",
    date: "Mar 9, 2026",
    excerpt:
      "A slim case, a leather strap and a quiet dial: how to wear a dress watch with tailoring, knitwear and weekends.",
    image: "/products/watch.svg",
    readTime: "6 min read",
    relatedArticleIds: [2, 3],
    content: [
      {
        type: "paragraph",
        text: "A dress watch works because it disappears: a slim case slides under a cuff, and a restrained dial never argues with a lapel or a collar.",
      },
      {
        type: "paragraph",
        text: "With tailoring, match the strap to your leather — brown strap with brown shoes, black with black. With knitwear and casual layers, the same watch on a lighter strap reads relaxed rather than formal.",
      },
      {
        type: "paragraph",
        text: "The rules are shorter than the exceptions: keep the dial quiet, the case thin, and let the strap do the talking. Everything else is confidence.",
      },
    ],
  },
];

export const GEMINI_SYSTEM_INSTRUCTION = STUDIO_CHAT_INSTRUCTION;
export const GEMINI_SYSTEM_INSTRUCTION_OPEN = STUDIO_CHAT_INSTRUCTION_OPEN;

export const NAV_LINKS = [
  { name: "Watches", path: collectionsUrl },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Our Story", path: "/about" },
  { name: "Our Studio", path: "/our-studio" },
];

export const FOOTER_LINKS = {
  shop: [
    { name: "Explore Watches", href: collectionsUrl },
    { name: "Collections", href: "/gallery" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Journal", href: "/journal" },
  ],
  company: [
    { name: "Our Story", href: "/about" },
    { name: "Our Studio", href: "/our-studio" },
    { name: "Contact Us", href: "/contact" },
  ],
  support: [
    { name: "Track Your Order", href: "/order/lookup" },
    { name: "Shipping & Delivery", href: "/shipping" },
    { name: "Returns & Refunds", href: "/returns" },
    { name: "FAQs", href: "/faq" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms & Conditions", href: "/terms" },
  ],
};
