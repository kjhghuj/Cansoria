import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { Article } from "@/lib/cms";

// Fallback data when no featured article is set
const FALLBACK_STORY = {
    slug: "how-to-turn-a-photo-into-a-hand-painted-oil-painting",
    category: "Photo to Painting",
    title: "How to Turn a Photo Into a Hand-Painted Oil Painting",
    excerpt:
        "Learn how a favorite portrait, wedding moment, family photo, or travel memory becomes a custom oil painting on canvas.",
    image: "/products/portrait.svg",
    readTime: "5 min read",
};

interface JournalHeroProps {
    featuredArticle?: Article | null;
    /**
     * The built-in story is content for static mode. When the CMS is healthy
     * but has no featured article, the hero must show an empty state instead
     * of promoting an article the CMS no longer contains.
     */
    allowStaticFallback?: boolean;
}

export default function JournalHero({ featuredArticle, allowStaticFallback = false }: JournalHeroProps) {
    // Use the featured article, the static-mode fallback, or a plain hero.
    const story = featuredArticle ? {
        slug: featuredArticle.slug,
        category: "Featured Story",
        title: featuredArticle.title,
        excerpt: featuredArticle.excerpt,
        image: featuredArticle.image,
        readTime: featuredArticle.readTime,
    } : allowStaticFallback ? FALLBACK_STORY : null;

    return (
        <section className="relative w-full h-[75vh] lg:h-[650px] flex flex-col lg:flex-row overflow-hidden bg-[#F5F3EF]">
            {/* Mobile Overlay / Desktop Image */}
            <div className="relative w-full lg:w-[55%] h-full order-1 lg:order-2">
                {story ? (
                    <ImageWithFallback
                        src={story.image}
                        alt={story.title}
                        fill
                        className="object-cover lg:hover:scale-105 transition-transform duration-[2s] ease-out"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#EFEBE3] to-[#E3DDD2]" />
                )}
                {/* Mobile Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent lg:hidden" />
            </div>

            {/* Text Content */}
            <div className="absolute bottom-0 left-0 w-full p-8 lg:static lg:w-[45%] lg:bg-cream lg:flex lg:flex-col lg:justify-center lg:px-20 lg:py-0 order-2 lg:order-1 z-10">
                <div className="animate-fade-in-up">
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-white/90 lg:text-terracotta mb-6">
                        {story ? story.category : "The Journal"}
                    </span>
                    <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-white lg:text-charcoal mb-8 leading-tight">
                        {story ? story.title : "Stories from the studio"}
                    </h1>
                    <p className="text-gray-200 lg:text-charcoal-light font-light text-base lg:text-lg leading-relaxed mb-10 max-w-md hidden md:block">
                        {story
                            ? story.excerpt
                            : "Reference photo guides, portrait concepts and notes on living with custom art. New stories will appear here."}
                    </p>
                    {story && (
                        <Link
                            href={`/journal/${story.slug}`}
                            className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white lg:text-charcoal border-b border-white lg:border-terracotta pb-2 hover:text-terracotta hover:border-terracotta transition-colors"
                        >
                            Read The Story <ArrowRight size={14} className="ml-2" />
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
