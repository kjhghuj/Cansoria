"use client";

import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FlorencessProduct } from "@/lib/florencess-products";
import ProductCard from "./ProductCard";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: FlorencessProduct[];
  tight?: boolean;
}

export default function ProductSection({
  title,
  subtitle,
  products,
  tight = false,
}: ProductSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((dir: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const step = rail.clientWidth * 0.75;
    rail.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  if (!products.length) return null;

  return (
    <section className={`fl-section${tight ? " fl-section--tight" : ""}`}>
      <div className="fl-container">
        <div className="fl-shelf">
          <div className="fl-rail__bar">
            <div className="fl-section__head" style={{ marginBottom: 0 }}>
              <h2 className="fl-section__title">{title}</h2>
              {subtitle ? <p className="fl-section__sub">{subtitle}</p> : null}
            </div>
            <div className="fl-rail__arrows">
              <button
                type="button"
                className="fl-rail__arrow"
                onClick={() => scrollBy(-1)}
                aria-label="Previous products"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="fl-rail__arrow"
                onClick={() => scrollBy(1)}
                aria-label="Next products"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="fl-rail" ref={railRef}>
            {products.map((p) => (
              <ProductCard key={`${p.id}-${p.name}`} product={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
