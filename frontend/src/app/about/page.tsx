"use client";

import ImageWithFallback from "@/components/ImageWithFallback";
import { Brush, Mail, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { COMPANY_INFO } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="bg-cream w-full pt-16 lg:pt-24">
      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-24 lg:mb-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 order-2 lg:order-1 animate-fade-in-up">
            <h1 className="font-serif text-4xl lg:text-6xl text-charcoal mb-8 leading-[1.1]">
              Hand-painted art
              <br />
              <span className="italic text-terracotta">for personal spaces.</span>
            </h1>
            <div className="prose text-charcoal-light font-light text-lg leading-relaxed space-y-6">
              <p>
                Cansoria creates custom oil paintings, portraits, pet memorials,
                wedding gifts, and canvas wall art for homes that deserve warmth
                and character.
              </p>
              <p>
                Every piece begins with a photo, room, memory, or mood. Our artists
                translate that reference into a hand-painted canvas with a preview
                before shipping.
              </p>
            </div>
          </div>

          <div className="flex-1 order-1 lg:order-2 w-full h-[500px] lg:h-[700px] bg-gray-100 relative overflow-hidden group">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=1200"
              alt="Artist painting on canvas"
              fill
              className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-terracotta/5 mix-blend-multiply"></div>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 border-y border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            <div className="text-center group">
              <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-6 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors duration-300">
                <Brush size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Real Brushwork
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                Each artwork is painted by hand, giving your canvas texture,
                depth, and variation that printed decor cannot replicate.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-6 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors duration-300">
                <Sparkles size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Personal Meaning
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                From family portraits to pet tributes and wedding gifts, we help
                turn meaningful photos into artwork made to be displayed.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-6 text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors duration-300">
                <ShieldCheck size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Preview Before Shipping
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                For custom work, you can review the finished direction before
                your artwork leaves the studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 w-full h-[400px] lg:h-[600px] bg-gray-100 relative overflow-hidden order-1">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200"
              alt="Brushes and oil paint in an art studio"
              fill
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>

          <div className="flex-1 order-2">
            <h2 className="font-serif text-3xl lg:text-5xl text-charcoal mb-8">
              Made for homes,
              <br />
              not warehouses.
            </h2>
            <div className="prose text-charcoal-light font-light text-lg leading-relaxed space-y-6">
              <p>
                We believe custom artwork should feel considered from start to
                finish: clear guidance, tasteful presentation, careful packaging,
                and secure checkout.
              </p>
              <p>
                Cansoria is built for people who want meaningful art without the
                cold, mass-produced feeling of ordinary decor shopping.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F1E8] py-20 border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-2xl text-charcoal mb-8">
            Get in Touch
          </h2>

          <div className="space-y-6 text-sm text-charcoal-light font-light">
            <p className="leading-relaxed">
              Have a question about a photo, canvas size, order, or gift
              timeline? Our studio team is here to help.
            </p>

            <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-6 border-y border-gray-300/50">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-terracotta" />
                <span>{COMPANY_INFO.supportEmail}</span>
              </div>
              <div className="hidden md:block w-[1px] h-4 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-terracotta" />
                <span>{COMPANY_INFO.address}</span>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 max-w-lg mx-auto leading-relaxed">
              {COMPANY_INFO.name}. {COMPANY_INFO.studioNote} Secure checkout is
              provided through trusted payment processors.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
