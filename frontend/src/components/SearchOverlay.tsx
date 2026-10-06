"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Search, ShoppingBag, FileText } from "lucide-react";
import { searchProducts } from "@/lib/medusa";
import { ARTICLES } from "@/lib/constants";
import { StoreProduct, Article } from "@/lib/types";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  regionId?: string;
}

export default function SearchOverlay({ isOpen, onClose, regionId }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [productResults, setProductResults] = useState<StoreProduct[]>([]);
  const [articleResults, setArticleResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const trendingSearches = ["Dog Portrait", "Cat Portrait", "Multi-Pet Family", "Memorial Keepsake", "Custom Pet Portrait"];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setProductResults([]);
      setArticleResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Search products from Medusa
      const products = await searchProducts(searchQuery, regionId);
      setProductResults(products.slice(0, 3));

      // Search articles locally
      const lowerQuery = searchQuery.toLowerCase();
      const filteredArticles = ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(lowerQuery) ||
          a.category.toLowerCase().includes(lowerQuery)
      ).slice(0, 2);
      setArticleResults(filteredArticles);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [regionId]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onClose();
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleLinkClick = (path: string) => {
    onClose();
    router.push(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-cream/95 backdrop-blur-md animate-fade-in flex flex-col">
      {/* Header / Close */}
      <div className="flex justify-end p-6 lg:p-10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
        >
          <X
            size={32}
            strokeWidth={1}
            className="text-charcoal group-hover:text-terracotta transition-colors"
          />
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 lg:px-8 flex flex-col">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="mb-12 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            className="w-full bg-transparent border-b border-gray-200 py-6 text-3xl lg:text-5xl font-serif text-charcoal placeholder:text-gray-300 focus:outline-none focus:border-terracotta transition-colors"
          />
          <button
            type="submit"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-charcoal hover:text-terracotta transition-colors"
          >
            <Search size={32} strokeWidth={1.5} />
          </button>
        </form>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
          {/* STATE A: EMPTY QUERY (Trending) */}
          {query.length < 2 && (
            <div className="animate-fade-in">
              <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light mb-6">
                Trending Searches
              </h4>
              <div className="flex flex-wrap gap-3 mb-12">
                {trendingSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-5 py-2 rounded-full border border-border bg-cream-light text-sm text-charcoal hover:border-toffee hover:text-toffee transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <h4 className="text-xs font-bold uppercase tracking-widest text-charcoal-light mb-6">
                Popular Categories
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    name: "Dog Portraits",
                    href: "/shop?category=dogs",
                    img: "/products/portrait.svg",
                  },
                  {
                    name: "Cat Masterpieces",
                    href: "/shop?category=cats",
                    img: "/products/canvas.svg",
                  },
                  {
                    name: "Multi-Pet & Family",
                    href: "/shop?category=multi-pet",
                    img: "/products/generic.svg",
                  },
                  {
                    name: "Memorial Keepsakes",
                    href: "/shop?category=memorial",
                    img: "/placeholder.svg",
                  },
                ].map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(cat.href)}
                    className="group relative aspect-square rounded-sm overflow-hidden"
                  >
                    <Image
                      src={cat.img}
                      alt={cat.name}
                      fill
                      className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-terracotta/20 transition-colors" />
                    <span className="absolute bottom-4 left-4 text-white font-serif text-lg">
                      {cat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATE B: RESULTS (Live) */}
          {query.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
              {/* Product Matches */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal-light mb-6 border-b border-gray-100 pb-2">
                  <ShoppingBag size={14} /> Products
                </h4>
                {isSearching ? (
                  <p className="text-sm text-gray-400">Searching...</p>
                ) : productResults.length > 0 ? (
                  <div className="space-y-6">
                    {productResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleLinkClick(`/product/${p.handle}`)}
                        className="flex gap-4 group cursor-pointer"
                      >
                        <div className="w-16 h-16 bg-gray-100 flex-shrink-0 rounded-sm overflow-hidden relative">
                          {p.thumbnail && (
                            <Image
                              src={p.thumbnail}
                              alt={p.title || "Product"}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div>
                          <h5 className="font-serif text-lg text-charcoal group-hover:text-terracotta transition-colors">
                            {p.title}
                          </h5>
                          <p className="text-sm text-charcoal-light">
                            {p.variants?.[0]?.calculated_price?.calculated_amount
                              ? `£${(p.variants[0].calculated_price.calculated_amount / 100).toFixed(2)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs uppercase tracking-widest text-terracotta font-bold hover:underline mt-4"
                    >
                      View all results
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No products found.</p>
                )}
              </div>

              {/* Journal Matches */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal-light mb-6 border-b border-gray-100 pb-2">
                  <FileText size={14} /> Journal
                </h4>
                {articleResults.length > 0 ? (
                  <div className="space-y-6">
                    {articleResults.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => handleLinkClick(`/journal/${a.slug}`)}
                        className="group cursor-pointer"
                      >
                        <span className="text-[10px] uppercase text-gray-400 mb-1 block">
                          {a.category}
                        </span>
                        <h5 className="font-serif text-lg text-charcoal group-hover:text-terracotta transition-colors leading-tight mb-1">
                          {a.title}
                        </h5>
                        <p className="text-xs text-charcoal-light line-clamp-1">
                          {a.readTime}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No stories found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
