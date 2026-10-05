"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    totalPages: number;
    initialPage?: number;
    onPageChange?: (page: number) => void;
}

export default function Pagination({
    totalPages,
    initialPage = 1,
    onPageChange,
}: PaginationProps) {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        onPageChange?.(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (totalPages <= 1) return null;

    return (
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
    );
}
