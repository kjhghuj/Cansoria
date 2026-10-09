import { STUDIO, STUDIO_CHAT_INSTRUCTION } from "./studio-content";
import { portraitStylesUrl } from "./portrait";

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
  address: "Custom pet portrait service in preparation",
  studioNote: STUDIO.readiness,
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Custom Portrait From Photo",
    subtitle: STUDIO.productSubtitle,
    category: "Custom Painting",
    price: 189,
    rating: 0,
    reviewCount: 0,
    description: STUDIO.productDescription,
    details: STUDIO.readiness,
    material: "To be confirmed",
    images: ["/products/portrait.svg"],
  },
  {
    id: "p2",
    name: "Pet Portrait Oil Painting",
    subtitle: STUDIO.productSubtitle,
    category: "Pet Portraits",
    price: 169,
    rating: 0,
    reviewCount: 0,
    description: STUDIO.productDescription,
    details: STUDIO.readiness,
    material: "To be confirmed",
    images: ["/images/pet-oil/classic-oil.webp"],
  },
];

export const ARTICLES: Article[] = [
  {
    id: 1,
    slug: "how-to-turn-a-photo-into-a-hand-painted-oil-painting",
    category: "Photo to Painting",
    title: "How to Turn a Photo Into a Hand-Painted Oil Painting",
    author: "The Cansoria Journal",
    date: "Feb 4, 2026",
    excerpt:
      "Learn how a favorite portrait, wedding moment, family photo, or travel memory becomes a custom oil painting on canvas.",
    image: "/products/portrait.svg",
    readTime: "5 min read",
    featuredProductId: "p1",
    relatedArticleIds: [2, 3],
    content: [
      {
        type: "paragraph",
        text: "A custom oil painting begins with a photo that carries personal meaning. The best references are clear, well-lit, and focused on the people, pets, or places you want the artist to preserve.",
      },
      {
        type: "heading",
        level: 2,
        text: "Start with a strong reference",
      },
      {
        type: "paragraph",
        text: "Choose a photo with visible facial details, natural light, and a composition you already love. If the image is older or imperfect, include notes about what matters most so the artist can focus on expression, posture, and atmosphere.",
      },
      {
        type: "paragraph",
        text: "Before commissioning a painting, ask the provider to confirm materials, production timing, preview arrangements and revision scope. Cansoria is still preparing these service details.",
      },
      {
        type: "image",
        src: "/products/canvas.svg",
        caption:
          "A clear photo gives the artist a stronger foundation for likeness and detail.",
      },
    ],
  },
  {
    id: 2,
    slug: "wedding-anniversary-gift-ideas-custom-oil-portraits",
    category: "Gift Ideas",
    title: "Best Wedding Anniversary Gift Ideas: Custom Oil Portraits",
    author: "The Cansoria Journal",
    date: "Feb 10, 2026",
    excerpt:
      "A custom oil portrait turns a wedding photo, first dance, proposal, or favorite shared memory into a lasting anniversary gift.",
    image: "/products/canvas.svg",
    readTime: "6 min read",
    relatedArticleIds: [1, 6],
    content: [
      {
        type: "paragraph",
        text: "Anniversary gifts feel strongest when they bring a shared memory back into the room. A custom oil portrait can transform a ceremony photo, first dance, engagement moment, or honeymoon scene into a piece of wall art made for daily life.",
      },
      {
        type: "paragraph",
        text: "For partners, choose a photo with natural emotion rather than a heavily posed frame. Soft expressions, meaningful locations, and balanced composition translate beautifully into paint.",
      },
      {
        type: "blockquote",
        text: "The most memorable anniversary gifts do not simply decorate a wall. They bring a private story into the home.",
      },
    ],
  },
  {
    id: 3,
    slug: "pet-memorial-portraits-meaningful-way-to-remember",
    category: "Pet Portraits",
    title:
      "Pet Memorial Portraits: A Meaningful Way to Remember Your Companion",
    author: "The Cansoria Journal",
    date: "Feb 18, 2026",
    excerpt:
      "Pet memorial portraits help preserve the expression, warmth, and everyday presence of a companion you never want to forget.",
    image: "/products/generic.svg",
    readTime: "4 min read",
    relatedArticleIds: [1, 2],
    content: [
      {
        type: "paragraph",
        text: "A pet memorial portrait is not about creating a perfect photograph in paint. It is about preserving the expression, posture, and small details that made your companion feel known.",
      },
      {
        type: "paragraph",
        text: "Choose a reference that shows the eyes clearly and captures the personality you remember most. A favorite blanket, collar, or familiar background can make the painting feel even more personal.",
      },
      {
        type: "paragraph",
        text: "When commissioning a keepsake, discuss how the direction and personal details will be reviewed. Cansoria preview and revision arrangements will be confirmed before commissions open.",
      },
    ],
  },
  {
    id: 4,
    slug: "choose-right-canvas-size-for-your-wall",
    category: "Home Decor",
    title: "How to Choose the Right Canvas Size for Your Wall",
    author: "The Cansoria Journal",
    date: "Feb 24, 2026",
    excerpt:
      "Use wall width, furniture scale, ceiling height, and viewing distance to choose a canvas size that feels intentional.",
    image: "/products/canvas.svg",
    readTime: "5 min read",
    relatedArticleIds: [5, 6],
    content: [
      {
        type: "paragraph",
        text: "Canvas size changes how a room feels. A small portrait can feel personal on a hallway wall, while a large landscape can anchor a living room, dining room, or office.",
      },
      {
        type: "heading",
        level: 2,
        text: "Match the canvas to the furniture below it",
      },
      {
        type: "paragraph",
        text: "As a starting point, artwork above a sofa, bed, or console often feels balanced when it spans about two-thirds of the furniture width. Leave breathing room around the canvas so the wall still feels calm.",
      },
      {
        type: "list",
        items: [
          "Choose smaller sizes for desks, shelves, and narrow halls.",
          "Choose medium sizes for bedrooms and reading corners.",
          "Choose large sizes for living rooms, dining rooms, and statement walls.",
        ],
      },
    ],
  },
  {
    id: 5,
    slug: "portrait-vs-landscape-oil-painting-home-style",
    category: "Style Guide",
    title: "Portrait vs Landscape Oil Painting: Which Style Fits Your Home?",
    author: "The Cansoria Journal",
    date: "Mar 3, 2026",
    excerpt:
      "Compare portrait and landscape formats so your custom oil painting fits the wall, room, and feeling you want to create.",
    image: "/products/portrait.svg",
    readTime: "5 min read",
    relatedArticleIds: [1, 4],
    content: [
      {
        type: "paragraph",
        text: "Portrait and landscape formats do more than describe the subject. They influence how the eye moves through a room and how the artwork relates to furniture, windows, and architectural lines.",
      },
      {
        type: "paragraph",
        text: "Portrait orientation works beautifully for individual faces, partners, pets, and narrow wall spaces. Landscape orientation is often better for family groups, wedding scenes, travel memories, and wide walls above furniture.",
      },
      {
        type: "blockquote",
        text: "Choose portrait format for presence. Choose landscape format for atmosphere.",
      },
    ],
  },
  {
    id: 6,
    slug: "hand-painted-art-vs-printed-canvas",
    category: "Art Education",
    title: "Why Hand-Painted Art Feels Different From Printed Canvas",
    author: "The Cansoria Journal",
    date: "Mar 9, 2026",
    excerpt:
      "Brush texture, subtle color variation, and the artist's interpretation give hand-painted artwork a presence that prints cannot fully copy.",
    image: "/products/generic.svg",
    readTime: "6 min read",
    relatedArticleIds: [1, 4],
    content: [
      {
        type: "paragraph",
        text: "Printed canvas can reproduce an image, but hand-painted art adds texture, interpretation, and small variations that make the piece feel alive in changing light.",
      },
      {
        type: "paragraph",
        text: "With oil painting, brushwork catches highlights, shadows deepen across layered color, and the surface has a physical presence. These details make the artwork feel less temporary and more connected to the room.",
      },
      {
        type: "paragraph",
        text: "For custom portraits and meaningful gifts, that difference matters. The goal is not only to display a memory, but to give it weight, warmth, and permanence.",
      },
    ],
  },
];

export const GEMINI_SYSTEM_INSTRUCTION = STUDIO_CHAT_INSTRUCTION;

export const NAV_LINKS = [
  { name: "Pet Portraits", path: portraitStylesUrl },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Our Story", path: "/about" },
  { name: "Our Studio", path: "/our-studio" },
];

export const FOOTER_LINKS = {
  shop: [
    { name: "Explore Pet Portraits", href: portraitStylesUrl },
    { name: "Style Gallery", href: "/gallery" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Photo Guide", href: "/upload-photo" },
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
