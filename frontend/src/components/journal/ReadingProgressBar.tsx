"use client";

import { useState, useEffect } from "react";

export default function ReadingProgressBar() {
    const [readingProgress, setReadingProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const totalScroll = document.documentElement.scrollTop;
            const windowHeight =
                document.documentElement.scrollHeight -
                document.documentElement.clientHeight;
            if (windowHeight === 0) return;
            const progress = totalScroll / windowHeight;
            setReadingProgress(progress * 100);
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className="fixed left-0 h-[4px] bg-terracotta z-[60] transition-all duration-100 ease-out"
            style={{
                width: `${readingProgress}%`,
                top: `calc(72px + var(--announcement-height, 0px))`,
            }}
        >
            <style jsx>{`
        @media (min-width: 1024px) {
          div {
            top: calc(88px + var(--announcement-height, 0px)) !important;
          }
        }
      `}</style>
        </div>
    );
}
