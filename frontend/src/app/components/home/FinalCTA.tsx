import { STUDIO } from "@/lib/studio-content";
import { portraitStylesUrl } from "@/lib/portrait";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-charcoal py-20 lg:py-28">
      {/* Warm candlelight glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,79,0.16) 0%, rgba(38,34,30,0) 65%)",
        }}
      />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-champagne-gold mb-6">
          Portrait inspiration
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-6xl text-cream leading-tight mb-6">
          Turn Today&rsquo;s Snuggles Into Tomorrow&rsquo;s Heirloom Art
        </h2>
        <p className="text-cream/70 font-light leading-relaxed max-w-2xl mx-auto mb-10">
          {STUDIO.description}
        </p>
        <a
          href={portraitStylesUrl}
          className="inline-flex items-center justify-center bg-toffee text-white px-9 py-4 text-xs uppercase tracking-widest font-bold rounded-xl shadow-[0_12px_32px_rgba(176,141,79,0.40)] hover:bg-toffee-dark transition-all"
        >
          Explore Portrait Styles
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </a>
        <p className="mt-6 text-xs text-cream/50 tracking-wide">
          {STUDIO.readiness}
        </p>
      </div>
    </section>
  );
}
