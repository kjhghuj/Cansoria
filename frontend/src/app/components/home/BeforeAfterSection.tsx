import Image from "next/image";

export function BeforeAfterSection() {
  return (
    <section className="bg-[#F3E7D3] py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[0.86fr_1.14fr] gap-12 lg:gap-20 items-center">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-5">
              From Photo Reference to Oil Painting
            </h2>
            <p className="text-charcoal-light text-base lg:text-lg font-light leading-relaxed mb-8">
              A favorite photo becomes more than a print. Our artists preserve
              the feeling of the original while adding canvas texture, painterly
              depth, and a warmer presence for your home.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs uppercase tracking-widest text-charcoal">
              <span>Photo guided</span>
              <span>Painted by hand</span>
              <span>Preview first</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative aspect-[4/5] overflow-hidden bg-white border border-[#D8C5A6]">
              <Image
                src="/placeholder.svg"
                alt="Photo reference placeholder"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 35vw"
              />
              <div className="absolute left-4 top-4 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-widest text-charcoal">
                Before
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden bg-white border border-[#D8C5A6] sm:mt-10">
              <Image
                src="/products/portrait.svg"
                alt="Hand-painted portrait canvas placeholder"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 35vw"
              />
              <div className="absolute left-4 top-4 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-widest text-charcoal">
                After
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
