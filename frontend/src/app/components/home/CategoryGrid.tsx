import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    name: "Dog Portraits",
    description:
      "Soulful single-dog oil portraits that catch the light in their eyes and every wisp of fur.",
    href: "/shop?category=dogs",
    image:
      "https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&q=80&w=1000",
    tag: "Most Loved",
  },
  {
    name: "Cat & Feline Masterpieces",
    description:
      "Soft, painterly feline portraits with all the attitude, elegance, and quiet judgment.",
    href: "/shop?category=cats",
    image:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=1000",
    tag: null,
  },
  {
    name: "Multiple Pets & Family",
    description:
      "Dogs, cats, and humans together on one canvas — harmony, chaos, and everything between.",
    href: "/shop?category=multi-pet",
    image:
      "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&q=80&w=1000",
    tag: null,
  },
  {
    name: "Memorial & Angel Keepsakes",
    description:
      "Tender rainbow-bridge portraits painted with warmth — a gentle way to keep them close.",
    href: "/shop?category=memorial",
    image:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=1000",
    tag: "Keepsake",
  },
];

export function CategoryGrid() {
  return (
    <section className="bg-cream-light py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-10 lg:mb-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-4">
              Find their moment
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
              Portraits for Every Kind of Companion
            </h2>
            <p className="text-charcoal-light font-light leading-relaxed">
              One dog, a clowder of cats, the whole furry family — or a gentle
              memorial. Choose where your story begins.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal border-b border-charcoal pb-1 hover:text-toffee hover:border-toffee transition-colors whitespace-nowrap"
          >
            View Pet Gallery <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative overflow-hidden rounded-2xl bg-cream-card aspect-[4/4.7] shadow-[0_6px_24px_rgba(38,34,30,0.06)]"
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/78 via-charcoal/15 to-transparent" />
              {category.tag && (
                <span className="absolute right-4 top-4 rounded-full bg-champagne-gold text-charcoal text-[9px] font-bold uppercase tracking-widest px-3 py-1.5">
                  {category.tag}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-serif text-xl lg:text-2xl text-white leading-tight mb-2">
                  {category.name}
                </h3>
                <p className="text-[13px] text-white/75 leading-relaxed mb-4">
                  {category.description}
                </p>
                <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-white border-b border-white/70 pb-1 group-hover:border-toffee group-hover:text-toffee transition-colors">
                  Commission Now <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
