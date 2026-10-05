"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import { Article } from "@/lib/cms";

interface ArticleGridProps {
    articles: Article[];
    focusArticle: Article | undefined;
    itemsPerPage?: number;
}

const ArticleCard = ({ article }: { article: Article }) => (
    <Link
        href={`/journal/${article.slug}`}
        className="group cursor-pointer flex flex-col h-full block"
    >
        <div className="relative overflow-hidden rounded-sm bg-gray-100 aspect-[3/2] mb-6">
            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors z-10 duration-500" />
            <ImageWithFallback
                src={article.image}
                alt={article.title}
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
        {/* Left Image (2/3) */}
        <div className="w-full md:w-2/3 h-72 md:h-auto relative overflow-hidden">
            <ImageWithFallback
                src={article.image}
                alt={article.title}
                fill
                className="object-cover opacity-90 transition-transform duration-[1.5s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        </div>
        {/* Right Text (1/3) */}
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

export default function ArticleGrid({
    articles,
    focusArticle,
    itemsPerPage = 9,
}: ArticleGridProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(articles.length / itemsPerPage);
    const currentArticles = articles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <section className="max-w-[1400px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
            {currentPage === 1 ? (
                <>
                    {/* Row 1: First 3 Articles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {currentArticles.slice(0, 3).map((article, idx) => (
                            <div
                                key={article.id}
                                style={{ animationDelay: `${idx * 100}ms` }}
                                className="animate-fade-in-up"
                            >
                                <ArticleCard article={article} />
                            </div>
                        ))}
                    </div>

                    {/* Focus Card */}
                    {focusArticle && (
                        <div className="animate-fade-in-up">
                            <FocusCard article={focusArticle} />
                        </div>
                    )}

                    {/* Remaining Articles on Page 1 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 mt-16">
                        {currentArticles.slice(3).map((article) => (
                            <div key={article.id} className="animate-fade-in-up">
                                <ArticleCard article={article} />
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {currentArticles.map((article, idx) => (
                        <div
                            key={article.id}
                            style={{ animationDelay: `${idx * 100}ms` }}
                            className="animate-fade-in-up"
                        >
                            <ArticleCard article={article} />
                        </div>
                    ))}
                </div>
            )}

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-24">
                    <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:border-terracotta hover:text-terracotta disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => handlePageChange(i + 1)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all ${currentPage === i + 1
                                    ? "bg-terracotta text-white"
                                    : "text-gray-500 hover:bg-gray-100"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:border-terracotta hover:text-terracotta disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </section>
    );
}
