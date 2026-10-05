"use client";

import { useState } from "react";

interface CategoryFilterProps {
    categories: string[];
    initialCategory?: string;
    onCategoryChange?: (category: string) => void;
}

export default function CategoryFilter({
    categories,
    initialCategory = "All Stories",
    onCategoryChange,
}: CategoryFilterProps) {
    const [activeCategory, setActiveCategory] = useState(initialCategory);

    const handleCategoryClick = (cat: string) => {
        setActiveCategory(cat);
        onCategoryChange?.(cat);
    };

    return (
        <div className="sticky top-[72px] lg:top-[88px] z-30 bg-cream/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
            <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
                <div className="flex items-center gap-4 lg:gap-8 py-4 overflow-x-auto no-scrollbar lg:justify-center">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
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
    );
}
