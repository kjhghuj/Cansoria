"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";

const PHOTO_SRC =
  "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&q=80&w=1400";

const detailChips = [
  { label: "Real Impasto Brushstrokes", icon: "🖌" },
  { label: "Emotional Expressive Eyes", icon: "✨" },
  { label: "Gallery-Wrapped Canvas", icon: "🖼" },
];

export function BeforeAfterSection() {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, pct)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) updateFromClientX(e.clientX);
  };

  const stopDragging = () => setDragging(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(4, p - 4));
    if (e.key === "ArrowRight") setPosition((p) => Math.min(96, p + 4));
  };

  return (
    <section className="bg-cream-card py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.84fr_1.16fr] gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-4">
              Photo to art, see it happen
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-5">
              From a Phone Snap to a Museum Oil Portrait
            </h2>
            <p className="text-charcoal-light text-base lg:text-lg font-light leading-relaxed mb-8">
              Drag the handle to watch a casual snapshot become thousands of
              hand-laid brushstrokes. Your pet&rsquo;s everyday joy, elevated
              into heirloom oil art you will keep for decades.
            </p>
            <ul className="flex flex-col gap-3">
              {detailChips.map((chip) => (
                <li
                  key={chip.label}
                  className="flex items-center gap-3 text-sm text-charcoal"
                >
                  <span
                    aria-hidden="true"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-border-subtle text-base shadow-sm"
                  >
                    {chip.icon}
                  </span>
                  <span className="font-medium">{chip.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive comparison slider */}
          <div>
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              className={`relative aspect-[4/3] w-full overflow-hidden rounded-[24px] ring-1 ring-border select-none touch-none ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              role="slider"
              tabIndex={0}
              aria-label="Compare your photo with the hand-painted oil portrait"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position)}
              onKeyDown={handleKeyDown}
            >
              {/* BEFORE: candid snapshot */}
              <Image
                src={PHOTO_SRC}
                alt="Casual phone photo of a dog running along the beach"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[#EDEDF0]/15 mix-blend-multiply"
              />

              {/* AFTER: hand-painted oil treatment (same photo, painted) */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 0 0 ${position}%)` }}
              >
                <Image
                  src={PHOTO_SRC}
                  alt="The same moment re-imagined as a hand-painted oil portrait with rich impasto texture"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  style={{ filter: "sepia(0.30) saturate(1.6) contrast(1.08) brightness(1.04)" }}
                />
                {/* Canvas weave texture */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 mix-blend-overlay"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(74,56,36,0.15) 0px, rgba(74,56,36,0.15) 1px, transparent 1px, transparent 4px)",
                  }}
                />
                {/* Warm oil glaze + vignette */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-toffee/10 mix-blend-multiply"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    boxShadow: "inset 0 0 90px rgba(59,42,24,0.30)",
                  }}
                />
              </div>

              {/* Labels */}
              <span className="absolute left-4 top-4 rounded-full bg-charcoal/70 text-white text-[10px] uppercase tracking-widest font-bold px-3.5 py-1.5 backdrop-blur-sm pointer-events-none">
                Your Snapshot
              </span>
              <span className="absolute right-4 top-4 rounded-full bg-toffee text-white text-[10px] uppercase tracking-widest font-bold px-3.5 py-1.5 shadow-sm pointer-events-none">
                Hand-Painted Oil
              </span>

              {/* Divider + handle */}
              <div
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.35)] pointer-events-none"
                style={{ left: `calc(${position}% - 1px)` }}
              >
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-full bg-white text-charcoal shadow-[0_6px_18px_rgba(38,34,30,0.35)] ring-1 ring-border">
                  <ChevronsLeftRight size={18} />
                </span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs uppercase tracking-widest text-charcoal-muted">
              Drag to compare · Same moment, thousands of brushstrokes apart
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
