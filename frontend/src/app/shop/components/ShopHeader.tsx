import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ShopHeader() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Photo hero banner */}
      <div className="relative h-[300px] sm:h-[340px] lg:h-[400px] w-full">
        <Image
          src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=2000"
          alt="Sunlit cream living room with framed hand-painted pet oil portraits above the sofa"
          fill
          priority
          className="object-cover object-[70%_center] lg:object-center"
          sizes="100vw"
        />
        {/* Cream gradient panel for text legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(250,248,245,0.97) 0%, rgba(250,248,245,0.92) 34%, rgba(250,248,245,0.55) 52%, rgba(250,248,245,0) 72%)",
          }}
        />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-toffee">
                Cansoria Bespoke Pet Art
              </p>
              <h1 className="mb-5 font-serif text-4xl leading-tight text-charcoal sm:text-5xl lg:text-6xl">
                Our Pet Portrait Collection
              </h1>
              <p className="mb-8 text-base leading-8 text-charcoal-light sm:text-lg">
                Timeless, hand-painted portraits of the ones who make life
                more beautiful. Museum-grade oils on archival linen, with a
                free sketch proof before shipping.
              </p>
              <Link
                href="#collection"
                className="inline-flex items-center gap-2 bg-toffee hover:bg-toffee-dark text-white px-7 py-3.5 text-[11px] uppercase tracking-widest font-bold rounded-full shadow-[0_8px_24px_rgba(176,141,79,0.35)] transition-colors"
              >
                Shop Now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
