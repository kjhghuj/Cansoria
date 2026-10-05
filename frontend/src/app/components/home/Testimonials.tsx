import { TESTIMONIALS } from "@/lib/constants";
import { Star } from "lucide-react";

export function Testimonials() {
  return (
    <section className="py-20 bg-cream border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-10 lg:mb-14">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal mb-4">
            Chosen for Meaningful Rooms and Gifts
          </h2>
          <p className="text-charcoal-light font-light leading-relaxed">
            Real custom artwork should feel considered, personal, and easy to
            live with.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="bg-white p-8 border border-gray-100 text-center"
            >
              <div className="flex justify-center text-terracotta mb-4 gap-1 text-xs">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <p className="font-serif text-lg text-charcoal mb-6 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <p className="text-xs uppercase tracking-widest text-gray-400">
                - {t.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
