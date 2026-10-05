"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MobileStickyBar() {
    const [showMobileSticky, setShowMobileSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight =
                document.documentElement.scrollHeight -
                document.documentElement.clientHeight;
            if (windowHeight === 0) return;
            const progress = totalScroll / windowHeight;
            setShowMobileSticky(progress > 0.25);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 z-40 lg:hidden transform transition-transform duration-300 shadow-[0_-5px_10px_rgba(0,0,0,0.02)] ${showMobileSticky ? "translate-y-0" : "translate-y-full"
                }`}
        >
            <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-serif text-charcoal text-sm truncate max-w-[180px]">
                        Enjoying this article?
                    </span>
                    <span className="text-[10px] text-terracotta font-bold uppercase tracking-widest">
                        Explore the collection
                    </span>
                </div>
                <Link
                    href="/shop"
                    className="bg-charcoal text-white px-6 py-3 text-xs uppercase font-bold tracking-widest rounded-sm shadow-lg whitespace-nowrap"
                >
                    Shop Now
                </Link>
            </div>
        </div>
    );
}
