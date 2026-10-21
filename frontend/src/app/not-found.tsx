import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-24">
      <div className="max-w-md w-full text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.32em] text-charcoal-light mb-4">
          404
        </p>
        <h1 className="font-serif text-4xl text-charcoal mb-4">
          Page not found
        </h1>
        <p className="text-charcoal-light leading-relaxed mb-8">
          The page you are looking for does not exist or may have moved. The
          collections and journal are always available.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-12 bg-charcoal text-white px-8 py-3 text-sm uppercase tracking-[0.18em] font-medium hover:bg-black transition-colors"
          >
            Back to home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center min-h-12 border border-charcoal text-charcoal px-8 py-3 text-sm uppercase tracking-[0.18em] font-medium hover:bg-cream-card transition-colors"
          >
            Explore watches
          </Link>
        </div>
      </div>
    </div>
  );
}
