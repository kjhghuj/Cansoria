import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    name: "Custom Portraits",
    description: "Family, couple, and individual portraits painted from your favorite photos.",
    href: "/shop?category=custom-painting",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=1200",
    className: "lg:col-span-2 lg:row-span-2",
  },
  {
    name: "Pet Portraits",
    description: "Warm keepsakes for beloved pets and meaningful memorial gifts.",
    href: "/shop?category=pet-portraits",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200",
    className: "",
  },
  {
    name: "Wedding & Anniversary",
    description: "Turn a ceremony, first dance, or shared moment into lasting art.",
    href: "/shop?category=wedding-anniversary",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200",
    className: "",
  },
  {
    name: "Landscape Paintings",
    description: "Soft horizons, travel memories, and scenic canvas pieces.",
    href: "/shop?category=landscape-paintings",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200",
    className: "",
  },
  {
    name: "Abstract Wall Art",
    description: "Painterly color, motion, and texture for modern interiors.",
    href: "/shop?category=abstract-wall-art",
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200",
    className: "",
  },
  {
    name: "Classic Reproductions",
    description: "Classically inspired oil paintings, hand-painted for your space.",
    href: "/shop?category=classic-reproductions",
    image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200",
    className: "lg:col-span-2",
  },
];

export function CategoryGrid() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-10 lg:mb-14">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
              Find the Right Painting for Your Story
            </h2>
            <p className="text-charcoal-light font-light leading-relaxed">
              Choose a personal custom order or browse art categories designed
              for gifting, decorating, and collecting.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal border-b border-charcoal pb-1 hover:text-terracotta hover:border-terracotta transition-colors"
          >
            View All Art <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[300px] gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className={`group relative overflow-hidden bg-canvas ${category.className}`}
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/72 via-charcoal/18 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 lg:p-7">
                <h3 className="font-serif text-2xl lg:text-3xl text-white leading-tight mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-white/78 leading-relaxed mb-4 max-w-sm">
                  {category.description}
                </p>
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-white border-b border-white pb-1">
                  Explore <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
