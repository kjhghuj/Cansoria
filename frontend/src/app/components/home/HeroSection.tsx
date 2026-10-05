import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const trustPoints = [
  "Custom from Your Photo",
  "Real Artist Brushwork",
  "100% Hand-Painted",
  "Free Preview Before Shipping",
  "Secure Checkout",
];

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] w-full overflow-hidden bg-cream">
      <Image
        src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=85&w=2200"
        alt="Artist painting a canvas in a warm studio"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/55 to-white/10 lg:bg-gradient-to-r lg:from-cream lg:via-cream/76 lg:to-cream/10" />

      <div className="relative z-10 min-h-[92vh] flex items-end lg:items-center">
        <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 pb-14 pt-32 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-terracotta">
              Custom hand-painted oil paintings from your photo
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl text-charcoal leading-[1.05] mb-6">
              Turn Your Favorite Photo Into a Hand-Painted Oil Painting
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-charcoal-light font-light leading-relaxed max-w-2xl mb-9">
              Our artists transform portraits, pets, weddings, and family
              memories into museum-quality canvas art made to last a lifetime.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
              <Link
                href="/shop?category=custom-painting"
                className="inline-flex justify-center items-center bg-terracotta text-white px-7 py-4 text-xs uppercase tracking-widest font-bold hover:bg-terracotta-dark transition-colors"
              >
                Start Your Custom Painting
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/shop"
                className="inline-flex justify-center items-center bg-white/80 text-charcoal border border-charcoal/20 px-7 py-4 text-xs uppercase tracking-widest font-bold hover:border-terracotta hover:text-terracotta transition-colors backdrop-blur-sm"
              >
                Shop Ready-Made Art
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs uppercase tracking-widest text-charcoal sm:grid-cols-2 lg:grid-cols-3">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-center gap-2 bg-white/70 px-3 py-2 backdrop-blur-sm">
                  <CheckCircle2 size={15} className="shrink-0 text-terracotta" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-charcoal-light">
              Place your order, upload your reference photo, review the digital
              preview, then approve shipping when the artwork feels right.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
