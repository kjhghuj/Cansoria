"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Represents a single story section with title, content, and image.
 * This interface is used for mock data until backend API is updated.
 */
export interface StorySection {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    imageAlt: string;
}

interface ProductStoryProps {
    sections?: StorySection[];
}

/**
 * ProductStory - A high-end, magazine-style story section for product pages.
 * 
 * Features:
 * - Z-pattern layout (Image-Text, Text-Image alternating)
 * - Serif typography for headings, sans-serif for body
 * - Fade-in animation on images
 * - Responsive: single column on mobile, two columns on desktop
 */
export default function ProductStory({ sections }: ProductStoryProps) {
    if (!sections || sections.length === 0) {
        return null;
    }

    return (
        <section className="py-24 lg:py-32 bg-cream/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-16 lg:mb-24">
                    <span className="text-xs uppercase tracking-[0.3em] text-terracotta font-medium">
                        The Story
                    </span>
                    <h2 className="mt-4 font-serif text-3xl sm:text-5xl lg:text-6xl text-charcoal leading-[1.15] tracking-tight">
                        Crafted With Purpose
                    </h2>
                </div>

                {/* Story Sections with Z-Pattern Layout */}
                <div className="space-y-20 lg:space-y-32">
                    {sections.map((section, index) => (
                        <StorySectionRow
                            key={section.id}
                            section={section}
                            isReversed={index % 2 === 1}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

interface StorySectionRowProps {
    section: StorySection;
    isReversed: boolean;
}

function StorySectionRow({ section, isReversed }: StorySectionRowProps) {
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center ${isReversed ? "lg:flex-row-reverse" : ""
                }`}
        >
            {/* Image Container */}
            <div
                className={`relative aspect-[4/3] lg:aspect-[3/4] overflow-hidden rounded-lg ${isReversed ? "lg:order-2" : "lg:order-1"
                    }`}
            >
                <div
                    className={`absolute inset-0 bg-border/20 transition-opacity duration-700 ${imageLoaded ? "opacity-0" : "opacity-100"
                        }`}
                />
                {section.imageUrl ? (
                    <Image
                        src={section.imageUrl}
                        alt={section.imageAlt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className={`object-cover transition-all duration-700 ease-out ${imageLoaded
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-[1.02]"
                            }`}
                        onLoad={() => setImageLoaded(true)}
                    />
                ) : null}
            </div>

            {/* Text Content */}
            <div
                className={`flex flex-col justify-center ${isReversed ? "lg:order-1 lg:pr-8" : "lg:order-2 lg:pl-8"
                    }`}
            >
                <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-6 tracking-tight">
                    {section.title}
                </h3>
                <div className="prose prose-lg max-w-none break-words whitespace-pre-line">
                    <p className="text-charcoal-light font-light text-lg md:text-xl leading-[1.8]">
                        {section.content}
                    </p>
                </div>
                {/* Decorative Line */}
                <div className="mt-8 w-16 h-[2px] bg-terracotta/60" />
            </div>
        </div>
    );
}
