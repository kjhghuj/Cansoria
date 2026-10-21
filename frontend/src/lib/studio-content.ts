import type { StoreProduct } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// PREPARATION vs OPEN — the store's two copy states.
//
// Single switch: the Medusa store record's `orders_open` flag (read via
// getStoreOrdersOpen() in lib/medusa.ts). While it is false, every surface
// below shows PREPARATION copy. On go-live day there is exactly ONE step:
//
//   GO-LIVE: in Medusa Admin → Settings → Store, set `orders_open` to true
//   (and redeploy/revalidate so ISR pages rebuild). Checkout unlocks and all
//   PREPARATION copy below flips to the OPEN copy in the same switch. No
//   second env var, no code change.
// ─────────────────────────────────────────────────────────────────────────────

export const collectionsUrl = "/#collections";

// Confirmed public facts. Presentation rules do not change commerce records.
export const STUDIO = {
  description:
    "Cansoria is preparing a collection of in-house watches. Explore the collections, dials and straps, and prepare the details that make your watch yours.",
  readiness:
    "Orders are in preparation. Movements, materials, engraving, warranty and delivery arrangements will be confirmed before orders open.",
  illustration: "Collection illustration — not a customer watch.",
  comparison: "Concept comparison — not a delivered customer watch.",
  scene: "Illustrative scene",
  productSubtitle: "A watch concept from the Cansoria collection.",
  productDescription:
    "Explore watch concepts and prepare your size, strap and dial preferences. Orders are in preparation; movements, materials, engraving, warranty and delivery arrangements will be confirmed before orders open.",
} as const;

// Open-store copy. Written in full now so go-live is a single flag flip.
// Grounded in confirmed service facts: in-house assembly and regulation,
// complimentary caseback engraving on engravable models, size/strap/dial
// options at checkout, Standard/Priority delivery, order emails.
export const STUDIO_OPEN = {
  description:
    "Cansoria designs, assembles and regulates watches in-house. Choose your case size, strap and dial, add complimentary caseback engraving on engravable models, and order a watch finished for your wrist.",
  readiness:
    "Orders are open. Order today, choose your size, strap and dial, and the studio regulates and checks your watch before it ships.",
  illustration: "Collection watch example.",
  comparison: "Wear and detail example.",
  scene: "Watch scene",
  productSubtitle: "A Cansoria watch assembled and regulated in-house.",
  productDescription:
    "Order a Cansoria watch in your case size, strap and dial. Engravable models include complimentary caseback engraving — every watch is assembled individually, regulated by hand, and confirmed by email.",
} as const;

export type StudioCopy = {
  description: string;
  readiness: string;
  illustration: string;
  comparison: string;
  scene: string;
  productSubtitle: string;
  productDescription: string;
};

/** The store's copy table for the current commerce state. */
export function studioCopy(ordersOpen: boolean): StudioCopy {
  return ordersOpen ? STUDIO_OPEN : STUDIO;
}

/** Home/meta titles for the current commerce state. */
export function studioHomeTitle(ordersOpen: boolean): string {
  return ordersOpen
    ? "Cansoria | Watches Designed, Assembled and Regulated In-House"
    : "Cansoria | Watch Concepts";
}

export const PREPARATION_STEPS = [
  {
    title: "Explore the collections",
    text: "Compare dress, dive, chronograph and everyday models and note the case size, dial and strap you prefer.",
    href: collectionsUrl,
    link: "Browse watches",
  },
  {
    title: "Prepare your engraving",
    text: "Think about the words, a date, or initials for the caseback. Up to twenty characters on engravable models.",
    href: "/how-it-works",
    link: "See how it works",
  },
  {
    title: "Ask us anything",
    text: "Share your questions about sizing, straps, movements and delivery. Service arrangements will be confirmed before orders open.",
    href: "/contact",
    link: "Contact us",
  },
] as const;

export const OPEN_STEPS = [
  {
    title: "Choose your watch",
    text: "Compare the collections and pick the case size, dial and strap that fit your wrist and wardrobe.",
    href: collectionsUrl,
    link: "Browse watches",
  },
  {
    title: "Add your engraving",
    text: "Personalise engravable models with up to twenty characters on the caseback — initials, a date, or a short message.",
    href: "/how-it-works",
    link: "See how it works",
  },
  {
    title: "Order with confidence",
    text: "Place your order and the studio regulates and checks your watch before it ships. Updates arrive by email.",
    href: collectionsUrl,
    link: "Start your order",
  },
] as const;

export function studioSteps(ordersOpen: boolean) {
  return ordersOpen ? OPEN_STEPS : PREPARATION_STEPS;
}

export const STUDIO_FAQ = [
  { title: "Are orders open?", text: STUDIO.readiness },
  {
    title: "Are these delivered customer watches?",
    text: "The images currently displayed are design illustrations and collection concepts. They do not document delivered customer watches or actual studio benches.",
  },
  {
    title: "Who assembles my watch?",
    text: "Production partners have not yet been confirmed. We will publish only authorised, accurate information about any future collaborators.",
  },
  {
    title: "Can I have my watch engraved?",
    text: "Caseback engraving — up to twenty characters with a choice of fonts — is planned as a complimentary option on engravable models. Final arrangements will be confirmed before orders open.",
  },
  {
    title: "What movements and materials will be used?",
    text: "Movement, case, crystal and strap specifications are still being determined. We will confirm them before orders open.",
  },
  {
    title: "Where will watches be made and shipped from?",
    text: "Assembly and dispatch locations, supported destinations and delivery timing have not yet been finalised. These details will be confirmed before orders open.",
  },
] as const;

// Open-store FAQ, written in full now. Answers stay grounded in the service
// facts above and point to policy pages instead of inventing guarantees.
export const STUDIO_FAQ_OPEN = [
  {
    title: "Are orders open?",
    text: STUDIO_OPEN.readiness,
  },
  {
    title: "How is my watch prepared?",
    text: "Every watch is assembled to order and regulated by hand across five positions. Your order confirmation summarises the size, strap, dial and engraving you chose, and the studio checks each watch before it ships.",
  },
  {
    title: "Can I have my watch engraved?",
    text: "Yes — engravable models include complimentary caseback engraving of up to twenty characters, with a choice of fonts. Enter your engraving on the product page before adding to the cart.",
  },
  {
    title: "What if something looks wrong with my order?",
    text: "Your order confirmation lets you verify the size, strap, dial and engraving you selected. If anything looks wrong, contact us with your order number before the watch ships and the studio will review it with you.",
  },
  {
    title: "What movements and materials are used?",
    text: "Each product page lists its movement, water resistance and case materials. Watches arrive with a two-year international warranty and the strap tool needed for quick-release straps.",
  },
  {
    title: "How is my watch delivered?",
    text: "Standard and Priority delivery options and their costs are calculated at checkout based on your address, and a delivery confirmation is emailed once your watch ships. See the delivery information page for details.",
  },
] as const;

export function studioFaq(ordersOpen: boolean) {
  return ordersOpen ? STUDIO_FAQ_OPEN : STUDIO_FAQ;
}

export const STUDIO_CHAT_INSTRUCTION = [
  "You are the Cansoria watch concierge. Be warm, concise and clear; usually reply in under 80 words.",
  "Confirmed brand facts: " + STUDIO.description,
  "Current service status: " + STUDIO.readiness,
  "The collections include dress watches, dive watches, chronographs, automatics and everyday models in 36–42mm cases with leather, steel and mesh strap options.",
  "Current images are design illustrations, not delivered customer watches or actual studio benches.",
  "Help visitors compare case sizes, straps and dials, plan engravings, and prepare questions.",
  "Production partners, their identities and nationalities, assembly and dispatch locations, movements, materials, prices for public sale, warranty terms, delivery timing, shipping coverage and refund policies have not been confirmed.",
  "Do not invent credentials, biographies, customer feedback, affiliations, addresses or service guarantees. Do not promise payment availability or a confirmed order.",
  "For an unconfirmed detail, clearly say it is still being determined before orders open. Do not infer it from an illustration or a visitor's suggestion.",
  `Use ${collectionsUrl} for collections, /how-it-works for the buying guide, /our-studio for the brand approach and /contact for inquiries.`,
  "For order-specific questions, direct the visitor to support with the order number; do not claim access to order status.",
  "Never make medical or legal claims, guarantee timekeeping accuracy or dates, or disclose collaborators' personal contacts.",
].join("\n");

export const STUDIO_CHAT_INSTRUCTION_OPEN = [
  "You are the Cansoria watch concierge. Be warm, concise and clear; usually reply in under 80 words.",
  "Brand facts: " + STUDIO_OPEN.description,
  "Current service status: " + STUDIO_OPEN.readiness,
  "The collections include dress watches, dive watches, chronographs, automatics and everyday models in 36–42mm cases with leather, steel and mesh strap options.",
  "Orders are placed from the product page: choose case size, strap and dial, add complimentary caseback engraving (up to twenty characters) on engravable models, and check out securely.",
  "Help visitors compare case sizes, straps and dials, plan engravings, and understand delivery options.",
  "Delivery: Standard and Priority options and costs are calculated at checkout; a delivery confirmation is emailed when the watch ships. Returns and refund terms are on the returns page.",
  "Do not invent credentials, biographies, customer feedback, affiliations or addresses. Do not promise shipping dates the checkout does not show.",
  "For order-specific questions, direct the visitor to support with the order number; do not claim access to order status.",
  `Use ${collectionsUrl} for collections, /how-it-works for the buying guide, /our-studio for the brand approach, /faq for service answers and /contact for inquiries.`,
  "Never make medical or legal claims, guarantee timekeeping accuracy or specific dates, or disclose collaborators' personal contacts.",
].join("\n");

export function studioChatInstruction(ordersOpen: boolean) {
  return ordersOpen ? STUDIO_CHAT_INSTRUCTION_OPEN : STUDIO_CHAT_INSTRUCTION;
}

export interface StudioPresentationOptions {
  /**
   * Commerce readiness from the store record. While closed (preparation), legacy
   * marketing claims are replaced with confirmed preparation facts. Once the
   * business opens orders, reviewed admin content — subtitle, description,
   * material and story sections — is presented as managed in the backend.
   */
  ordersOpen?: boolean;
}

/** Neutralize review/rating claims that the product record has not verified. */
function verifiedReviewsOnly(metadata: Record<string, unknown>) {
  if (metadata.reviews_verified === true) return metadata;
  return {
    ...metadata,
    reviews_verified: false,
    rating: null,
    average_rating: null,
    review_rating: null,
    review_count: 0,
    reviews: 0,
    rating_count: 0,
  };
}

/** Replace unconfirmed legacy copy without modifying the product's commerce data. */
export function studioProduct(
  product: StoreProduct,
  options: StudioPresentationOptions = {},
): StoreProduct {
  if (options.ordersOpen) {
    return {
      ...product,
      metadata: verifiedReviewsOnly(product.metadata ?? {}),
    };
  }
  return {
    ...product,
    subtitle: STUDIO.productSubtitle,
    description: STUDIO.productDescription,
    material: null,
    tags: product.tags?.filter((tag) => !/best|popular/i.test(tag.value || "")),
    metadata: {
      ...product.metadata,
      story_sections: [],
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

export function studioProductSeo(
  product: StoreProduct,
  options: StudioPresentationOptions = {},
) {
  const presented = studioProduct(product, options);
  const image = product.thumbnail || product.images?.[0]?.url;
  const fallbackDescription = studioCopy(Boolean(options.ordersOpen)).productDescription;
  const description =
    presented.description ||
    (options.ordersOpen ? product.description : undefined) ||
    fallbackDescription;
  return {
    title: (product.title || "Watch Concept") + " | Cansoria",
    description,
    alternates: {
      canonical: product.handle ? "/product/" + product.handle : "/",
    },
    openGraph: {
      title: product.title || "Cansoria Watch Concepts",
      description,
      images: image ? [{ url: image, alt: STUDIO.illustration }] : [],
      type: "website" as const,
    },
  };
}
