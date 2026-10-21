import { Metadata } from "next";
import {
  getArticlesDetailed,
  getFallbackArticles,
  getFeaturedArticle,
  Article,
} from "@/lib/cms";
import JournalHero from "@/components/journal/JournalHero";
import JournalContent from "@/components/journal/JournalContent";

// Disable caching for this page (instant Strapi content updates)
export const dynamic = 'force-dynamic';

// SEO Metadata
export const metadata: Metadata = {
  title: "Journal | Cansoria - Watch Guides",
  description:
    "Explore watch buying guides, movement basics, care tips, engraving ideas, and styling notes for wearing time well.",
  openGraph: {
    title: "Journal | Cansoria",
    description:
      "Explore watch buying guides, movement basics, care tips, engraving ideas, and styling notes for wearing time well.",
    type: "website",
  },
};

const CATEGORIES = [
  "All Stories",
  "Watch Basics",
  "Buying Guide",
  "Care",
  "Gift Ideas",
  "Style Guide",
];

export default async function JournalPage() {
  // Distinguish a reachable-but-empty CMS from an unavailable/disabled one:
  // only the latter falls back to the built-in editorial content.
  const [articlesResult, cmsFeaturedArticle] = await Promise.all([
    getArticlesDetailed(),
    getFeaturedArticle(),
  ]);
  const cmsHealthy = articlesResult.source === "cms";
  const fallbackArticles = getFallbackArticles();
  const articles = cmsHealthy ? articlesResult.articles : fallbackArticles;
  const featuredArticle =
    cmsFeaturedArticle ||
    // Static mode uses the built-in story; a healthy CMS without a featured
    // article shows the empty hero instead of an old static story.
    (!cmsHealthy ? fallbackArticles[0] || null : null);

  // Filter out the featured article from the grid (if it exists)
  const gridArticles = featuredArticle
    ? articles.filter((a: Article) => a.slug !== featuredArticle.slug)
    : articles;

  return (
    <div className="bg-cream min-h-screen pt-[72px] lg:pt-[88px]">
      {/* 1. HERO SECTION - Uses Strapi featured content, then static-mode fallback content */}
      <JournalHero featuredArticle={featuredArticle} allowStaticFallback={!cmsHealthy && !featuredArticle} />

      {/* 2. FILTER BAR + ARTICLE GRID */}
      <JournalContent
        articles={gridArticles}
        focusArticle={undefined}
        categories={CATEGORIES}
      />

      {cmsHealthy && articles.length === 0 && (
        <div className="mx-auto max-w-3xl px-6 pb-20 text-center">
          <h2 className="font-serif text-2xl text-charcoal mb-2">
            Journal stories are coming soon
          </h2>
          <p className="text-sm text-charcoal-light">
            The studio journal is connected and will publish new stories shortly.
          </p>
        </div>
      )}

    </div>
  );
}
