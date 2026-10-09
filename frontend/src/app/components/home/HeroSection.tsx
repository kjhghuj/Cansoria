import Image from "next/image";
import { portraitStylesUrl } from "@/lib/portrait";
import { STUDIO } from "@/lib/studio-content";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-cream">
      {/* Soft sunlight glows */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-24 w-[560px] h-[560px] rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(176,141,79,0.14) 0%, rgba(250,248,245,0) 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(197,160,89,0.12) 0%, rgba(250,248,245,0) 68%)",
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-8 pt-32 pb-16 lg:pt-40 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-12 xl:gap-16 items-center">
          {/* LEFT: Copy */}
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-champagne-gold/50 bg-cream-light/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-7">
              <span aria-hidden="true">✦</span> Bespoke Pet Oil Portraits
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.6rem] text-charcoal leading-[1.08] mb-6">
              Capture Your Companion&rsquo;s Soul in{" "}
              <em className="not-italic text-toffee">
                Personal Portrait Concepts
              </em>
            </h1>
            <p className="text-base sm:text-lg text-charcoal-light font-light leading-relaxed max-w-xl mb-9">
              {STUDIO.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-9">
              <a
                href={portraitStylesUrl}
                className="inline-flex justify-center items-center bg-toffee text-white px-8 py-4 text-xs uppercase tracking-widest font-bold rounded-xl shadow-[0_10px_28px_rgba(176,141,79,0.32)] hover:bg-toffee-dark hover:shadow-[0_10px_24px_rgba(143,111,53,0.30)] transition-all"
              >
                Explore Portrait Styles
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={portraitStylesUrl}
                className="inline-flex justify-center items-center bg-cream-light/70 text-charcoal border border-charcoal/20 px-8 py-4 text-xs uppercase tracking-widest font-bold rounded-xl hover:border-toffee hover:text-toffee transition-colors backdrop-blur-sm"
              >
                View Pet Gallery
              </a>
            </div>

            <p className="text-xs text-charcoal-light">{STUDIO.readiness}</p>
          </div>

          {/* RIGHT: Sunlit cream living room with framed pet oil portrait */}
          <div className="relative">
            <div className="relative aspect-[4/3.4] sm:aspect-[4/3] rounded-[24px] overflow-hidden shadow-[0_28px_64px_rgba(38,34,30,0.16)] ring-1 ring-border">
              <Image
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1400"
                alt="Illustrative living room inspiration"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 46vw"
              />
            </div>

            {/* Framed golden retriever oil portrait on the wall */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[10%] w-[34%] rotate-[-1.5deg] shadow-[0_18px_40px_rgba(38,34,30,0.28)] rounded-sm">
              <div className="bg-[#C9A06B] p-[6px] rounded-[3px]">
                <div className="bg-[#A9854F] p-[4px]">
                  <div className="relative aspect-[4/4.6] overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=700"
                      alt="Golden retriever reference concept"
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 40vw, 18vw"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Illustration label */}
            <div className="absolute -bottom-5 -left-3 sm:-left-6 flex items-center gap-3 rounded-2xl bg-charcoal text-cream px-5 py-4 shadow-[0_16px_36px_rgba(38,34,30,0.30)]">
              <span
                className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-champagne-gold text-champagne-gold text-[10px] font-bold tracking-wider uppercase leading-tight text-center"
                aria-hidden="true"
              >
                IDEA
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest">
                  Style Illustration
                </p>
                <p className="text-[11px] text-cream/70">Concept imagery</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
