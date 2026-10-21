"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { X, Search, ShoppingBag, FileText } from "lucide-react";
import { formatPrice, searchProducts } from "@/lib/medusa";
import { lowestProductPrice } from "@/lib/money";
import { DEFAULT_CURRENCY_CODE } from "@/lib/market";
import { ARTICLES } from "@/lib/constants";
import { StoreProduct, Article } from "@/lib/types";
import { collectionsUrl } from "@/lib/studio-content";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  regionId?: string;
}

/** Matches the journal index API's stale-while-revalidate window. */
const JOURNAL_INDEX_TTL_MS = 5 * 60_000;

type JournalIndex = { articles: Article[]; fetchedAt: number };

export default function SearchOverlay({ isOpen, onClose, regionId }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [productResults, setProductResults] = useState<StoreProduct[]>([]);
  const [articleResults, setArticleResults] = useState<Article[]>([]);
  // null while the final journal set is still being resolved — the built-in
  // list must not surface as a guess during that wait; it is only the fallback
  // when the API itself fails (the API applies the same healthy-CMS-authoritative
  // policy as the journal pages, including an authoritative empty list).
  const [journalIndex, setJournalIndex] = useState<JournalIndex | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGeneration = useRef(0);
  const router = useRouter();

  const trendingSearches = ["Automatic", "Dive Watch", "Chronograph", "Dress Watch", "Engraving"];
const collections = [
  { handle: "heritage-classic-40", name: "Dress" },
  { handle: "northsea-diver", name: "Dive" },
  { handle: "regent-chronograph", name: "Chronograph" },
  { handle: "meridian-automatic", name: "Automatic" },
];

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => { clearTimeout(timer); document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  // Load the same final journal content set the journal pages use; refresh on
  // reopen once the cached entry ages out so content changes appear in-session.
  useEffect(() => {
    if (!isOpen) return;
    if (journalIndex && Date.now() - journalIndex.fetchedAt < JOURNAL_INDEX_TTL_MS) return;
    let cancelled = false;
    fetch("/api/journal/articles")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("journal index unavailable"))))
      .then((data) => {
        if (cancelled) return;
        // A healthy CMS may be authoritative-but-empty: [] is a final answer,
        // not a reason to keep showing the built-in list.
        if (Array.isArray(data?.articles)) setJournalIndex({ articles: data.articles as Article[], fetchedAt: Date.now() });
        else throw new Error("malformed journal index");
      })
      .catch(() => {
        // Only an unavailable API falls back to the built-in editorial list,
        // the same content the server-side fallback serves.
        if (!cancelled) setJournalIndex({ articles: ARTICLES, fetchedAt: Date.now() });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, journalIndex]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string, generation: number) => {
    if (searchQuery.length < 2) {
      setProductResults([]);
      setArticleResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Search products from Medusa
      const products = await searchProducts(searchQuery, regionId);
      if (generation !== searchGeneration.current) return;
      setProductResults(products.slice(0, 3));

      // Search the journal's final content set. While that set is still being
      // resolved, no article guesses are shown.
      if (journalIndex === null) {
        setArticleResults([]);
      } else {
        const lowerQuery = searchQuery.toLowerCase();
        const filteredArticles = journalIndex.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(lowerQuery) ||
            a.category.toLowerCase().includes(lowerQuery)
        ).slice(0, 2);
        setArticleResults(filteredArticles);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      if (generation === searchGeneration.current) setIsSearching(false);
    }
  }, [regionId, journalIndex]);

  useEffect(() => {
    const generation = ++searchGeneration.current;
    if (!isOpen) return;
    const debounceTimer = setTimeout(() => {
      void performSearch(query.trim(), generation);
    }, 300);

    return () => { clearTimeout(debounceTimer); searchGeneration.current += 1; };
  }, [query, performSearch, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

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
    <div role="dialog" aria-modal="true" aria-label="Search the studio" className="fixed inset-0 z-[60] bg-cream/95 backdrop-blur-md animate-fade-in flex flex-col">
      {/* Header / Close */}
      <div className="flex justify-end p-6 lg:p-10">
        <button
          aria-label="Close search"
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
            aria-label="Search products and stories"
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
                Collections
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {collections.map((collection) => (
                  <Link
                    key={collection.handle}
                    href={`/product/${collection.handle}`}
                    onClick={onClose}
                    className="group rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-toffee"
                    aria-label={`Explore ${collection.name}, collection illustration`}
                  >
                    <div className="relative aspect-[200/246] overflow-hidden rounded-sm bg-cream-card">
                      <Image
                        src={`/images/watches/${collection.handle}.svg`}
                        alt={`${collection.name} watch collection illustration`}
                        fill
                        loading="lazy"
                        sizes="(max-width: 767px) 44vw, 23vw"
                        className="object-contain"
                      />
                    </div>
                    <span className="mt-3 block font-serif text-lg text-charcoal group-hover:text-toffee transition-colors">
                      {collection.name}
                    </span>
                    <span className="mt-1 block text-xs text-charcoal-light">Collection illustration</span>
                  </Link>
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
                      <a
                        key={p.id}
                        href={p.handle ? `/product/${p.handle}` : collectionsUrl}
                        onClick={(event) => {
                          if (p.handle) {
                            event.preventDefault();
                            handleLinkClick(`/product/${p.handle}`);
                          } else {
                            onClose();
                          }
                        }}
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
                            {lowestProductPrice(p) !== undefined
                              ? formatPrice(lowestProductPrice(p), p.variants?.find(variant => variant.calculated_price)?.calculated_price?.currency_code || DEFAULT_CURRENCY_CODE)
                              : ""}
                          </p>
                        </div>
                      </a>
                    ))}
                    <button
                      onClick={handleSearchSubmit}
                      className="text-xs uppercase tracking-widest text-terracotta font-bold hover:underline mt-4"
                    >
                      View all results
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400 italic">No products found.</p>
                    <a href={collectionsUrl} onClick={onClose} className="text-sm text-toffee underline">
                      Explore Watches
                    </a>
                  </div>
                )}
              </div>

              {/* Journal Matches */}
              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-charcoal-light mb-6 border-b border-gray-100 pb-2">
                  <FileText size={14} /> Journal
                </h4>
                {isSearching || journalIndex === null ? (
                  <p className="text-sm text-gray-400">{journalIndex === null ? "Checking stories..." : "Searching..."}</p>
                ) : articleResults.length > 0 ? (
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
