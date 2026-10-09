import type { StoreProduct } from "./types";
import { portraitStylesUrl } from "./portrait";

// Confirmed public facts. Presentation rules do not change commerce records.
export const STUDIO = {
  description:
    "Cansoria is preparing a custom pet portrait service. Explore style concepts and prepare the details that make your companion unmistakably yours.",
  readiness:
    "Commissions are in preparation. Production, materials, previews, revisions and delivery arrangements will be confirmed before orders open.",
  illustration: "Style illustration — not a customer commission.",
  comparison: "Concept comparison — not a completed customer commission.",
  scene: "Illustrative scene",
  productSubtitle: "A portrait concept inspired by personal memories.",
  productDescription:
    "Explore artwork concepts and prepare your reference and preferences. Commissions are in preparation; materials, production, previews, revisions and delivery arrangements will be confirmed before orders open.",
} as const;

export const PREPARATION_STEPS = [
  {
    title: "Explore a style",
    text: "Compare the four style illustrations and note the colours, background and mood you prefer.",
    href: portraitStylesUrl,
    link: "Explore portrait styles",
  },
  {
    title: "Prepare your photo",
    text: "Choose a clear photo with the expression you love. Note any details, backgrounds or memories you want to preserve.",
    href: "/upload-photo",
    link: "Read the photo guide",
  },
  {
    title: "Discuss your portrait",
    text: "Share your ideas and questions. Production and service arrangements will be confirmed before commissions open.",
    href: "/contact",
    link: "Contact us",
  },
] as const;

export const STUDIO_FAQ = [
  { title: "Are commissions open?", text: STUDIO.readiness },
  {
    title: "Are these completed customer portraits?",
    text: "The images currently displayed are design illustrations and style concepts. They do not document completed customer commissions or actual painting sessions.",
  },
  {
    title: "Who will paint my portrait?",
    text: "Production partners have not yet been confirmed. We will publish only authorised, accurate information about any future collaborators.",
  },
  {
    title: "Can I request a preview or revisions?",
    text: "Preview arrangements, revision scope and any related costs will be confirmed before orders open. No preview or revision policy has been finalised yet.",
  },
  {
    title: "What materials will be used?",
    text: "Canvas, paint, framing and packaging specifications are still being determined. We will confirm them before commissions open.",
  },
  {
    title: "Where will portraits be made and shipped from?",
    text: "Production and dispatch locations, supported destinations and delivery timing have not yet been finalised. These details will be confirmed before orders open.",
  },
] as const;

export const STUDIO_CHAT_INSTRUCTION = [
  "You are the Cansoria art concierge. Be warm, concise and clear; usually reply in under 80 words.",
  "Confirmed brand facts: " + STUDIO.description,
  "Current service status: " + STUDIO.readiness,
  "The four style concepts are Classic Oil, Soft Impression, Textured Oil and Dark Classic.",
  "Current images are design illustrations, not completed customer commissions or actual painting sessions.",
  "Help visitors choose reference photos, describe backgrounds, explore style concepts and prepare questions.",
  "Production partners, their identities and nationalities, production and dispatch locations, materials, framing, prices for public sale, preview policies, revision scope, delivery timing, shipping coverage and refund policies have not been confirmed.",
  "Do not invent credentials, biographies, customer feedback, affiliations, addresses or service guarantees. Do not promise payment availability or a confirmed order.",
  "For an unconfirmed detail, clearly say it is still being determined before commissions open. Do not infer it from a style illustration or a visitor's suggestion.",
  `Use ${portraitStylesUrl} for style concepts, /upload-photo for photo guidance, /our-studio for the brand approach and /contact for inquiries.`,
  "For order-specific questions, direct the visitor to support with the order number; do not claim access to order status.",
  "Never make medical or legal claims, guarantee likeness or dates, or disclose collaborators' personal contacts.",
].join("\n");

/** Replace unconfirmed legacy copy without modifying the product's commerce data. */
export function studioProduct(product: StoreProduct): StoreProduct {
  return {
    ...product,
    subtitle: STUDIO.productSubtitle,
    description: STUDIO.productDescription,
    material: null,
    tags: product.tags?.filter((tag) => !/best|popular/i.test(tag.value || "")),
    metadata: {
      ...product.metadata,
      story_sections: [],
      free_preview: false,
      freePreview: false,
      reviews_verified: false,
      rating: null,
      average_rating: null,
      review_rating: null,
      review_count: 0,
      reviews: 0,
      rating_count: 0,
      best_seller: false,
      bestseller: false,
    },
  };
}

export function studioProductSeo(product: StoreProduct) {
  const presented = studioProduct(product);
  const image =
    product.handle === "pet-portrait-oil-painting"
      ? "/images/pet-oil/classic-oil.webp"
      : product.thumbnail || product.images?.[0]?.url;
  return {
    title: (product.title || "Portrait Concept") + " | Cansoria",
    description: presented.description || STUDIO.productDescription,
    alternates: {
      canonical: product.handle ? "/product/" + product.handle : "/",
    },
    openGraph: {
      title: product.title || "Cansoria Portrait Concepts",
      description: presented.description || STUDIO.productDescription,
      images: image ? [{ url: image, alt: STUDIO.illustration }] : [],
      type: "website" as const,
    },
  };
}
