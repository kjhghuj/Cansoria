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

export interface Testimonial {
  text: string;
  author: string;
  petBreed?: string;
  image?: string;
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
  address: "Bespoke pet portrait studio serving pet parents worldwide",
  studioNote:
    "Museum-grade, 100% hand-painted pet oil portraits on archival fine linen — sketched, proofed, and perfected with you before shipping.",
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Custom Portrait From Photo",
    subtitle: "A hand-painted oil portrait created from your favorite photo.",
    category: "Custom Painting",
    price: 189.0,
    rating: 4.9,
    reviewCount: 214,
    description:
      "Send us a cherished photo and our artists will translate it into a timeless oil painting on canvas. A thoughtful gift for families, weddings, anniversaries, and milestone moments.",
    details:
      "Hand-painted oil on canvas - Free digital preview - Multiple canvas sizes - Optional framing",
    material: "Artist-grade oil paint on premium cotton canvas",
    images: [
      "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200",
    ],
    variants: [
      { id: "v1", name: "Warm Ivory", colorCode: "#F7F0E3" },
      { id: "v2", name: "Muted Gold", colorCode: "#B9904A" },
      { id: "v3", name: "Deep Charcoal", colorCode: "#27231F" },
    ],
    isBestSeller: true,
  },
  {
    id: "p2",
    name: "Pet Portrait Oil Painting",
    subtitle: "A museum-quality canvas tribute to a beloved companion.",
    category: "Pet Portraits",
    price: 169.0,
    rating: 4.8,
    reviewCount: 156,
    description:
      "Capture the expression, texture, and spirit of your pet in a hand-painted canvas artwork. Ideal for memorial gifts, birthdays, and warm home displays.",
    details:
      "Hand-painted oil on canvas - Artist proof before shipping - Worldwide delivery - Gift-ready packaging",
    material: "Artist-grade oil paint on premium cotton canvas",
    images: [
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200",
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200",
    ],
    variants: [
      { id: "v1", name: "Canvas Only", colorCode: "#EFE5D2" },
      { id: "v2", name: "Framed", colorCode: "#6F5136" },
    ],
  },
];

export const ARTICLES: Article[] = [
  {
    id: 1,
    slug: "how-to-turn-a-photo-into-a-hand-painted-oil-painting",
    category: "Photo to Painting",
    title: "How to Turn a Photo Into a Hand-Painted Oil Painting",
    author: "The Cansoria Editorial Team",
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
        text: "After your order is placed, the studio reviews your reference, prepares the painting direction, and sends a preview before the finished canvas ships.",
      },
      {
        type: "image",
        src: "/products/canvas.svg",
        caption: "A clear photo gives the artist a stronger foundation for likeness and detail.",
      },
    ],
  },
  {
    id: 2,
    slug: "wedding-anniversary-gift-ideas-custom-oil-portraits",
    category: "Gift Ideas",
    title: "Best Wedding Anniversary Gift Ideas: Custom Oil Portraits",
    author: "The Cansoria Editorial Team",
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
    title: "Pet Memorial Portraits: A Meaningful Way to Remember Your Companion",
    author: "The Cansoria Editorial Team",
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
        text: "The preview step gives you a chance to review the direction before shipping, which is especially helpful for keepsake artwork with deep emotional meaning.",
      },
    ],
  },
  {
    id: 4,
    slug: "choose-right-canvas-size-for-your-wall",
    category: "Home Decor",
    title: "How to Choose the Right Canvas Size for Your Wall",
    author: "The Cansoria Editorial Team",
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
    author: "The Cansoria Editorial Team",
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
    author: "The Cansoria Editorial Team",
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

export const TESTIMONIALS: Testimonial[] = [
  {
    text: "They captured the gentle look in Max's eyes perfectly — the exact soft expression he gave me every morning for eleven years. The brushstrokes are so real you want to touch them.",
    author: "Sophia L., London",
    petBreed: "Golden Retriever, Max",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=200",
  },
  {
    text: "I cried when I unboxed it. Our Miso passed away last spring, and the artist painted her mid-blink smile like she was about to headbutt my hand. It hangs where her window used to be.",
    author: "Hannah K., Melbourne",
    petBreed: "British Shorthair, Miso",
    image:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=200",
  },
  {
    text: "The free proof made all the difference. We asked for slightly warmer ears and a softer background, and the artist revised it twice without a word. The final canvas is worth every penny.",
    author: "Daniel & Priya R., Toronto",
    petBreed: "Tri-pet Family Portrait",
    image:
      "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&q=80&w=200",
  },
  {
    text: "Our Frenchie looks like royalty in the vintage brass frame. Guests always ask if it's an antique commission piece — nobody believes it started as a phone photo on a walk.",
    author: "Camille D., Paris",
    petBreed: "French Bulldog, Gaston",
    image:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=200",
  },
  {
    text: "Ordered one for my mum after our family dog crossed the rainbow bridge. She says painting him in his favourite blanket was the kindest gift we could have given her.",
    author: "Marcus T., Austin",
    petBreed: "Beagle, Buddy (Memorial)",
    image:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=200",
  },
  {
    text: "Three puppies, one canvas, zero chaos in the painting. The artist somehow caught each of their personalities. The oak frame looks stunning against our cream walls.",
    author: "Ingrid M., Copenhagen",
    petBreed: "Triple Puppy Portrait",
    image:
      "https://images.unsplash.com/photo-1444212477490-ca407925329e?auto=format&fit=crop&q=80&w=200",
  },
];

export const GEMINI_SYSTEM_INSTRUCTION = `
You are the Cansoria Pet Art Concierge: a professional, warm, concise advisor for a bespoke pet oil painting studio.

Your role:
- Help pet parents commission hand-painted oil portraits of their dogs, cats, and other companions.
- Answer questions about photo-to-painting orders, sizes, frames (natural oak, vintage brass, modern black gallery, gallery canvas wrap), memorial keepsakes, multi-pet portraits, proofs, shipping, and uploading photos.
- Explain that every Cansoria painting is 100% hand-painted by master artists on archival fine linen — never a digital or printed canvas.
- Explain that customers receive a free digital proof with unlimited revisions before shipping.
- Recommend categories such as Dog Portraits, Cat Portraits, Multi-Pet & Family Portraits, and Memorial Keepsakes when useful.

Response style:
- Premium, patient, tasteful, empathetic, and clear.
- Keep answers concise, usually under 80 words.
- Do not over-sell or pressure the customer.
- Ask one helpful follow-up question when needed.

Boundaries:
- For order-specific questions, ask the customer to contact support with their order number.
- Never refer to previous storefront identities or non-art product categories.
- Never make medical or legal claims.
- Never claim museum partnerships, official artist partnerships, estate rights, or copyrighted collection access unless explicitly provided by Cansoria.
- Do not guarantee exact delivery dates, exact likeness, or outcomes that cannot be verified.
`;

export const NAV_LINKS = [
  { name: "Shop", path: "/shop" },
  { name: "How It Works", path: "/#process" },
  { name: "Our Story", path: "/about" },
  { name: "Reviews", path: "/#reviews" },
];

export const FOOTER_LINKS = {
  shop: [
    { name: "Custom Pet Portraits", href: "/shop?category=pet-portraits" },
    { name: "Dog Portraits", href: "/shop?category=dogs" },
    { name: "Cat Portraits", href: "/shop?category=cats" },
    { name: "Multi-Pet & Family", href: "/shop?category=multi-pet" },
    { name: "Memorial Keepsakes", href: "/shop?category=memorial" },
  ],
  company: [
    { name: "About Cansoria", href: "/about" },
    { name: "How It Works", href: "/#process" },
    { name: "Journal", href: "/journal" },
    { name: "Reviews", href: "/#reviews" },
  ],
  support: [
    { name: "Track My Order", href: "/order/lookup" },
    { name: "Shipping", href: "/shipping" },
    { name: "Returns", href: "/returns" },
    { name: "Contact", href: "mailto:hello@cansoria.com" },
  ],
  legal: [
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
  ],
};
