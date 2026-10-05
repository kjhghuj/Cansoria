import { Metadata } from "next";
import {
  getArticles,
  getFallbackArticles,
  getFeaturedArticle,
  Article,
} from "@/lib/cms";
import JournalHero from "@/components/journal/JournalHero";
import JournalContent from "@/components/journal/JournalContent";
import NewsletterSection from "@/components/journal/NewsletterSection";

// Disable caching for this page (instant Strapi content updates)
export const dynamic = 'force-dynamic';

// SEO Metadata
export const metadata: Metadata = {
  title: "Journal | Cansoria - Custom Oil Painting Guides",
  description:
    "Explore custom oil painting guides, portrait tips, gift ideas, canvas styling notes, and home decor art inspiration.",
  openGraph: {
    title: "Journal | Cansoria",
    description:
      "Explore custom oil painting guides, portrait tips, gift ideas, canvas styling notes, and home decor art inspiration.",
    type: "website",
  },
};

const CATEGORIES = [
  "All Stories",
  "Photo to Painting",
  "Home Decor",
  "Gift Ideas",
  "Pet Portraits",
  "Style Guide",
  "Art Education",
];

export default async function JournalPage() {
  // Fetch articles and featured article from Strapi CMS
  const [cmsArticles, cmsFeaturedArticle] = await Promise.all([
    getArticles(),
    getFeaturedArticle(),
  ]);
  const fallbackArticles = getFallbackArticles();
  const articles = cmsArticles.length > 0 ? cmsArticles : fallbackArticles;
  const featuredArticle =
    cmsFeaturedArticle || (cmsArticles.length === 0 ? fallbackArticles[0] : null);

  // Filter out the featured article from the grid (if it exists)
  const gridArticles = featuredArticle
    ? articles.filter((a: Article) => a.slug !== featuredArticle.slug)
    : articles;

  return (
    <div className="bg-cream min-h-screen pt-[72px] lg:pt-[88px]">
      {/* 1. HERO SECTION - Uses Strapi featured content, then fallback content */}
      <JournalHero featuredArticle={featuredArticle} />

      {/* 2. FILTER BAR + ARTICLE GRID */}
      <JournalContent
        articles={gridArticles}
        focusArticle={undefined}
        categories={CATEGORIES}
      />

      {/* 3. NEWSLETTER */}
      <NewsletterSection />
    </div>
  );
}
