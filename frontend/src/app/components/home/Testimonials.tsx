import Image from "next/image";
import { TESTIMONIALS } from "@/lib/constants";
import { Star } from "lucide-react";

export function Testimonials() {
  return (
    <section id="reviews" className="py-20 lg:py-28 bg-cream-card border-y border-border scroll-mt-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-10 lg:mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-4">
            Wet noses, happy tears
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
            Loved by 12,000+ Pet Parents
          </h2>
          <p className="text-charcoal-light font-light leading-relaxed">
            Real commissions, real unboxings, real happy tears. Here is what
            happens when a phone photo meets a master artist.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <figure
              key={idx}
              className="flex flex-col rounded-2xl bg-cream-light border border-border-subtle p-7 shadow-[0_6px_24px_rgba(38,34,30,0.05)]"
            >
              <div className="flex items-center gap-3 mb-5">
                {t.image && (
                  <span className="relative block w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                    <Image
                      src={t.image}
                      alt={`${t.author}'s pet`}
                      fill
                      className="object-cover"
                      sizes="44px"
                    />
                  </span>
                )}
                <figcaption>
                  <p className="text-sm font-semibold text-charcoal leading-tight">
                    {t.author}
                  </p>
                  {t.petBreed && (
                    <p className="text-[11px] text-charcoal-muted mt-0.5">
                      {t.petBreed}
                    </p>
                  )}
                </figcaption>
                <span className="ml-auto flex text-champagne-gold gap-0.5" aria-label="5 star review">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              </div>
              <blockquote className="text-sm text-charcoal-light leading-relaxed">
                &ldquo;{t.text}&rdquo;
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
