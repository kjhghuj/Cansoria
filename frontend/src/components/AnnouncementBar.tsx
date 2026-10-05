"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { getStore } from "@/lib/medusa";

// Type for announcement bar configuration  
interface AnnouncementBarConfig {
    enabled: boolean;
    message: string;
    link: string;
}

interface StoreMetadata {
    announcement_bar?: AnnouncementBarConfig;
}

export default function AnnouncementBar({ onHeightChange }: { onHeightChange?: (height: number) => void }) {
    const [config, setConfig] = useState<AnnouncementBarConfig | null>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const barRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const store = await getStore();
                const metadata = store?.metadata as StoreMetadata | undefined;
                const announcementBar = metadata?.announcement_bar;

                if (announcementBar && announcementBar.enabled && announcementBar.message) {
                    setConfig(announcementBar);
                }
            } catch (error) {
                console.error("[AnnouncementBar] Failed to fetch config:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchConfig();
    }, []);

    // Check for text overflow - Improved logic
    useEffect(() => {
        const checkOverflow = () => {
            if (textRef.current && containerRef.current) {
                // Use scrollWidth vs clientWidth for more reliable detection
                // Add a small buffer (32px) to account for padding/close button
                const isOver = textRef.current.offsetWidth > (containerRef.current.offsetWidth - 40);
                setIsOverflowing(isOver);
            }
        };

        if (config && isVisible) {
            // Check immediately and after a short delay for font loading
            checkOverflow();
            const timer = setTimeout(checkOverflow, 200);
            window.addEventListener('resize', checkOverflow);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', checkOverflow);
            };
        }
    }, [config, isVisible]);

    // Measure height and report changes
    useEffect(() => {
        if (!barRef.current || !onHeightChange) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (isVisible && config) {
                    onHeightChange(entry.contentRect.height);
                } else {
                    onHeightChange(0);
                }
            }
        });

        observer.observe(barRef.current);
        return () => observer.disconnect();
    }, [isVisible, config, onHeightChange]);

    // Report 0 when hidden or not active
    useEffect(() => {
        if ((!isVisible || !config) && onHeightChange) {
            onHeightChange(0);
        }
    }, [isVisible, config, onHeightChange]);

    if (isLoading || !config || !isVisible) {
        return null;
    }

    const content = (
        <span ref={textRef} className="text-xs sm:text-sm font-medium tracking-wide whitespace-nowrap px-1">
            {config.message}
        </span>
    );

    // Inline style for marquee animation to ensure it works regardless of Tailwind config
    const marqueeStyle: React.CSSProperties = {
        animation: 'marquee 15s linear infinite',
        display: 'flex',
        gap: '3rem',
        paddingLeft: '1rem',
        whiteSpace: 'nowrap',
    };

    return (
        <div
            ref={barRef}
            className="fixed top-0 left-0 right-0 bg-terracotta text-white z-[100] transition-all duration-300 ease-in-out shadow-sm"
        >
            <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="flex items-center justify-center h-8 overflow-hidden relative" ref={containerRef}>

                    {config.link ? (
                        <Link
                            href={config.link}
                            className={`flex items-center transition-opacity hover:opacity-90 w-full ${!isOverflowing ? 'justify-center' : ''}`}
                        >
                            {isOverflowing ? (
                                <div style={marqueeStyle}>
                                    {content}
                                    {content}
                                    {content}
                                    {content}
                                </div>
                            ) : (
                                content
                            )}
                        </Link>
                    ) : (
                        <div className={`flex items-center w-full ${!isOverflowing ? 'justify-center' : ''}`}>
                            {isOverflowing ? (
                                <div style={marqueeStyle}>
                                    {content}
                                    {content}
                                    {content}
                                    {content}
                                </div>
                            ) : (
                                content
                            )}
                        </div>
                    )}

                    {/* Close Button - Always fixed right with background to cover text */}
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            if (onHeightChange) onHeightChange(0);
                        }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-full transition-colors z-20 bg-terracotta shadow-[-8px_0_12px_rgba(176,139,125,1)]"
                        aria-label="Close announcement"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
