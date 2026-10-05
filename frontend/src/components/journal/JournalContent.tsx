"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { Article } from "@/lib/cms";

interface JournalContentProps {
    articles: Article[];
    focusArticle: Article | undefined;
    categories: string[];
    itemsPerPage?: number;
}

// --- Article Cards ---

const ArticleCard = ({ article }: { article: Article }) => (
    <Link
        href={`/journal/${article.slug}`}
        className="group cursor-pointer flex flex-col h-full block"
    >
        <div className="relative overflow-hidden rounded-sm bg-gray-100 aspect-[3/2] mb-6">
            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors z-10 duration-500" />
            <ImageWithFallback
                src={article.image}
                alt={article.imageAlt}
                fill
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
            />
        </div>
        <div className="flex flex-col flex-grow">
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta">
                    {article.category}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {article.readTime}
                </span>
            </div>
            <h3 className="font-serif text-xl lg:text-2xl text-charcoal leading-tight mb-3 group-hover:text-terracotta transition-colors">
                {article.title}
            </h3>
            <p className="text-sm text-charcoal-light font-light line-clamp-3 leading-relaxed">
                {article.excerpt}
            </p>
        </div>
    </Link>
);

const FocusCard = ({ article }: { article: Article }) => (
    <Link
        href={`/journal/${article.slug}`}
        className="group cursor-pointer w-full bg-[#2C2C2C] rounded-sm overflow-hidden flex flex-col md:flex-row my-16 shadow-lg block"
    >
        <div className="w-full md:w-2/3 h-72 md:h-auto relative overflow-hidden">
            <ImageWithFallback
                src={article.image}
                alt={article.imageAlt}
                fill
                className="object-cover opacity-90 transition-transform duration-[1.5s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        </div>
        <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col justify-center text-white relative">
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta mb-4">
                {article.category}
            </span>
            <h3 className="font-serif text-2xl md:text-3xl mb-6 leading-tight group-hover:text-terracotta transition-colors">
                {article.title}
            </h3>
            <p className="text-gray-400 font-light text-sm leading-relaxed mb-8 border-l border-gray-600 pl-4">
                {article.excerpt}
            </p>
            <div className="flex items-center text-xs uppercase tracking-widest font-bold text-white group-hover:text-terracotta transition-colors mt-auto">
                Read Story{" "}
                <ArrowRight
                    size={14}
                    className="ml-2 group-hover:translate-x-1 transition-transform"
                />
            </div>
        </div>
    </Link>
);

// --- Main Component ---

export default function JournalContent({
    articles,
    focusArticle,
    categories,
    itemsPerPage = 9,
}: JournalContentProps) {
    const [activeCategory, setActiveCategory] = useState("All Stories");
    const [currentPage, setCurrentPage] = useState(1);

    // Filter articles by category
    const filteredArticles = useMemo(() => {
        if (activeCategory === "All Stories") {
            return articles;
        }
        return articles.filter((a) => a.category === activeCategory);
    }, [articles, activeCategory]);

    // Check if focus article should show (only on "All Stories" or matching category)
    const showFocusArticle = useMemo(() => {
        if (!focusArticle) return false;
        if (activeCategory === "All Stories") return true;
        return focusArticle.category === activeCategory;
    }, [focusArticle, activeCategory]);

    // Pagination
    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
    const currentArticles = filteredArticles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleCategoryChange = (category: string) => {
        setActiveCategory(category);
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <>
            {/* Category Filter Bar - top value = navbar height + announcement bar height */}
            <div className="sticky top-[104px] lg:top-[120px] z-20 bg-cream/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
                    <div className="flex items-center gap-4 lg:gap-8 py-4 overflow-x-auto no-scrollbar lg:justify-center">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`whitespace-nowrap px-5 py-2 lg:p-0 rounded-full lg:rounded-none border lg:border-none text-xs uppercase tracking-widest transition-all ${activeCategory === cat
                                    ? "bg-terracotta border-terracotta text-white lg:bg-transparent lg:text-charcoal lg:border-b-2 lg:border-terracotta font-bold"
                                    : "border-gray-200 text-gray-500 hover:text-terracotta hover:border-terracotta"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Article Grid */}
            <section className="max-w-[1400px] mx-auto px-6 lg:px-8 py-16">
                {/* Focus Article */}
                {showFocusArticle && focusArticle && (
                    <FocusCard article={focusArticle} />
                )}

                {/* No articles message */}
                {currentArticles.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-gray-500 text-lg">
                            No articles found in this category.
                        </p>
                    </div>
                )}

                {/* Grid */}
                {currentArticles.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {currentArticles.map((article) => (
                            <ArticleCard key={article.id} article={article} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-16">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:border-terracotta transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                (page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${currentPage === page
                                            ? "bg-terracotta text-white"
                                            : "border border-gray-200 hover:border-terracotta"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-full border border-gray-200 disabled:opacity-30 hover:border-terracotta transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </section>
        </>
    );
}
