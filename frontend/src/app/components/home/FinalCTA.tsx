import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-charcoal py-20 lg:py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl lg:text-6xl text-cream leading-tight mb-6">
          Create a Painting That Feels Personal
        </h2>
        <p className="text-cream/70 font-light leading-relaxed max-w-2xl mx-auto mb-9">
          Start with a photo, a room, or an occasion. Cansoria will help turn it
          into a hand-painted canvas made to be kept.
        </p>
        <Link
          href="/shop?category=custom-painting"
          className="inline-flex items-center justify-center bg-terracotta text-white px-8 py-4 text-xs uppercase tracking-widest font-bold hover:bg-[#B9904A] transition-colors"
        >
          Start Your Custom Order
        </Link>
      </div>
    </section>
  );
}
