"use client";

import Image from "next/image";
import { portraitStylesUrl } from "@/lib/portrait";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type FrameKey = "oak" | "brass" | "black" | "canvas";
type SizeKey = "12x16" | "18x24" | "24x36";

const ARTWORK_SRC =
  "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=800";

const frames: Record<
  FrameKey,
  { name: string; note: string; price: number; swatch: string }
> = {
  oak: {
    name: "Natural Oak",
    note: "Warm & versatile — quiet Japandi and cream interiors",
    price: 39,
    swatch: "bg-[#C9A06B]",
  },
  brass: {
    name: "Vintage Brass",
    note: "Gilded elegance — French vintage and ceremonial poise",
    price: 59,
    swatch: "bg-[linear-gradient(135deg,#E3C77E,#B08D3E_55%,#D4B36A)]",
  },
  black: {
    name: "Modern Black Gallery",
    note: "Matte contrast — contemporary gallery presence",
    price: 49,
    swatch: "bg-[#2A2724]",
  },
  canvas: {
    name: "Gallery Canvas Wrap",
    note: "Canvas concept — no frame",
    price: 0,
    swatch: "bg-[#EFE9DE]",
  },
};

const sizes: Record<
  SizeKey,
  { label: string; display: string; base: number; note: string }
> = {
  "12x16": {
    label: '12×16"',
    display: "w-[24%]",
    base: 159,
    note: "Desks, shelves & cozy nooks",
  },
  "18x24": {
    label: '18×24"',
    display: "w-[30%]",
    base: 229,
    note: "Bedrooms & reading corners",
  },
  "24x36": {
    label: '24×36"',
    display: "w-[38%]",
    base: 329,
    note: "Living room statement wall",
  },
};

function FrameStyle({
  frame,
  children,
}: {
  frame: FrameKey;
  children: React.ReactNode;
}) {
  if (frame === "canvas") {
    return (
      <div className="border-[10px] border-[#EFE9DE] shadow-[0_10px_26px_rgba(38,34,30,0.14)]">
        {children}
      </div>
    );
  }
  if (frame === "brass") {
    return (
      <div
        className="p-[12px] shadow-[0_14px_32px_rgba(38,34,30,0.24)]"
        style={{
          background:
            "linear-gradient(135deg,#E3C77E 0%,#B08D3E 48%,#E3C77E 62%,#C69E52 100%)",
        }}
      >
        <div className="bg-[#8A6D2F] p-[4px]">{children}</div>
      </div>
    );
  }
  if (frame === "black") {
    return (
      <div className="bg-[#2A2724] p-[10px] shadow-[0_14px_32px_rgba(38,34,30,0.26)]">
        <div className="bg-white p-[18px]">{children}</div>
      </div>
    );
  }
  return (
    <div className="bg-[#C9A06B] p-[10px] shadow-[0_14px_32px_rgba(38,34,30,0.22)]">
      <div className="bg-[#A9854F] p-[5px]">{children}</div>
    </div>
  );
}

export function PetFrameCustomizerPreview() {
  const [frame, setFrame] = useState<FrameKey>("oak");
  const [size, setSize] = useState<SizeKey>("18x24");

  const total = sizes[size].base + frames[frame].price;

  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-12 lg:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-4">
            Design it your way
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
            Try Frames &amp; Sizes in Your Own Space
          </h2>
          <p className="text-charcoal-light font-light leading-relaxed">
            Explore an illustrative room preview with different frame and size
            concepts. Final materials, options and production details will be
            confirmed before commissions open.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-start">
          {/* LEFT: controls */}
          <div className="order-2 lg:order-1 flex flex-col gap-8">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal mb-4">
                1 · Choose your frame
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(frames) as FrameKey[]).map((key) => {
                  const active = frame === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFrame(key)}
                      aria-pressed={active}
                      className={`group text-left rounded-2xl border p-4 transition-all ${
                        active
                          ? "border-toffee bg-cream-light shadow-[0_8px_24px_rgba(176,141,79,0.16)]"
                          : "border-border-subtle bg-cream-light/60 hover:border-toffee/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={`block w-9 h-9 rounded-lg ring-1 ring-black/10 ${frames[key].swatch}`}
                          aria-hidden="true"
                        />
                        <span
                          className={`flex items-center justify-center w-5 h-5 rounded-full border transition-colors ${
                            active
                              ? "bg-toffee border-toffee text-white"
                              : "border-border bg-white text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-charcoal leading-tight">
                        {frames[key].name}
                      </p>
                      <p className="text-xs text-charcoal-light leading-snug mt-1">
                        {frames[key].note}
                      </p>
                      <p className="text-[11px] font-semibold text-toffee mt-2">
                        {frames[key].price === 0
                          ? "Included"
                          : `+ $${frames[key].price}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal mb-4">
                2 · Pick a canvas size
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(sizes) as SizeKey[]).map((key) => {
                  const active = size === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSize(key)}
                      aria-pressed={active}
                      className={`rounded-full border px-5 py-2.5 text-xs font-bold tracking-wide transition-all ${
                        active
                          ? "bg-charcoal text-cream border-charcoal shadow-[0_6px_16px_rgba(38,34,30,0.22)]"
                          : "bg-cream-light text-charcoal border-border-subtle hover:border-charcoal/40"
                      }`}
                    >
                      {sizes[key].label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-charcoal-light mt-3">
                {sizes[size].note}
              </p>
            </div>

            <div className="rounded-2xl bg-cream-card border border-border-subtle p-6">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-charcoal-muted mb-1">
                    Estimated total
                  </p>
                  <p className="font-serif text-4xl text-charcoal leading-none">
                    ${total}
                  </p>
                  <p className="text-[11px] text-charcoal-light mt-2">
                    {sizes[size].label} · {frames[frame].name} · Illustrative
                    options
                  </p>
                </div>
                <a
                  href={portraitStylesUrl}
                  className="shrink-0 inline-flex items-center bg-toffee text-white px-6 py-3.5 text-[11px] uppercase tracking-widest font-bold rounded-xl hover:bg-toffee-dark transition-colors shadow-[0_8px_22px_rgba(176,141,79,0.30)]"
                >
                  Customize This Look
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <p className="text-xs text-charcoal-light leading-relaxed border-t border-border pt-4">
                This room preview illustrates a possible layout. It is not a
                production proof or a completed customer commission.
              </p>
            </div>
          </div>

          {/* RIGHT: live room preview */}
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[4/3.2] sm:aspect-[4/3] rounded-[24px] overflow-hidden ring-1 ring-border shadow-[0_24px_56px_rgba(38,34,30,0.14)]">
              <Image
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=1400"
                alt="Cream-toned living room wall previewing your framed pet oil portrait"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 52vw"
              />
              {/* Live framed artwork */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-[12%] ${sizes[size].display} transition-all duration-500 ease-out`}
              >
                <FrameStyle frame={frame}>
                  <div className="relative aspect-[4/4.6] overflow-hidden transition-all duration-500">
                    <Image
                      src={ARTWORK_SRC}
                      alt={`Golden retriever pet oil portrait in the ${frames[frame].name} finish`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 40vw, 22vw"
                    />
                  </div>
                </FrameStyle>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs uppercase tracking-widest text-charcoal-muted">
                Illustrative preview · {sizes[size].label}
              </p>
              <p className="text-xs font-semibold text-toffee">
                {frames[frame].name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
