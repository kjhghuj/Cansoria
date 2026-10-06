"use client";

import ImageWithFallback from "@/components/ImageWithFallback";
import { Brush, Mail, MapPin, ShieldCheck, HeartHandshake } from "lucide-react";
import { COMPANY_INFO } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="bg-cream w-full pt-16 lg:pt-24">
      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 mb-24 lg:mb-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 order-2 lg:order-1 animate-fade-in-up">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee">
              ✦ Bespoke pet oil portrait studio
            </p>
            <h1 className="font-serif text-4xl lg:text-6xl text-charcoal mb-8 leading-[1.1]">
              For the ones who greet you
              <br />
              <span className="italic text-toffee">like you hung the moon.</span>
            </h1>
            <div className="prose text-charcoal-light font-light text-lg leading-relaxed space-y-6">
              <p>
                Cansoria began with a simple ache: our companions give us their
                whole lives, and their lives are heartbreakingly short. We
                paint dogs, cats, and every cherished pet in museum-grade oil
                on archival linen — not to replace a photo, but to give a
                memory the weight, texture, and permanence it deserves.
              </p>
              <p>
                Every portrait starts with your favorite photo and a
                hand-drawn sketch proof. You revise it with your artist until
                the eyes are right — because they always recognise
                themselves in your face, and you should recognise them in
                ours.
              </p>
            </div>
          </div>

          <div className="flex-1 order-1 lg:order-2 w-full h-[500px] lg:h-[700px] rounded-[24px] bg-cream-card border border-border-subtle relative overflow-hidden group shadow-[0_20px_48px_rgba(38,34,30,0.10)]">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=1200"
              alt="Artist hand-painting a pet oil portrait on canvas"
              fill
              className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-toffee/5 mix-blend-multiply"></div>
          </div>
        </div>
      </section>

      <section className="bg-cream-card border-y border-border py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            <div className="text-center group">
              <div className="w-16 h-16 bg-cream-light border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-6 text-toffee group-hover:bg-toffee group-hover:text-white transition-colors duration-300">
                <Brush size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Real Brushwork, Real Oils
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                Master artists build each portrait in layered impasto oil on
                acid-free fine linen — texture and depth no printed canvas
                can imitate.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-cream-light border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-6 text-toffee group-hover:bg-toffee group-hover:text-white transition-colors duration-300">
                <HeartHandshake size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Painted With Empathy
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                From joyful puppy eyes to gentle rainbow-bridge memorials, we
                paint the personality you know by heart — fur wisps, whiskers,
                and all.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-cream-light border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-6 text-toffee group-hover:bg-toffee group-hover:text-white transition-colors duration-300">
                <ShieldCheck size={28} strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">
                Proof First, Always
              </h3>
              <p className="text-charcoal-light font-light leading-relaxed text-sm lg:text-base px-4">
                You approve a free digital sketch with unlimited revisions
                before a single stroke reaches the final canvas. Nothing ships
                until it feels like them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-6 lg:px-8 py-24 lg:py-32">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 w-full h-[400px] lg:h-[600px] rounded-[24px] bg-cream-card border border-border-subtle relative overflow-hidden order-1 shadow-[0_16px_40px_rgba(38,34,30,0.08)]">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200"
              alt="Brushes and oil paints in the Cansoria pet portrait studio"
              fill
              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
          </div>

          <div className="flex-1 order-2">
            <h2 className="font-serif text-3xl lg:text-5xl text-charcoal mb-8">
              Made for pet families,
              <br />
              not factories.
            </h2>
            <div className="prose text-charcoal-light font-light text-lg leading-relaxed space-y-6">
              <p>
                We believe commissioning art of your best friend should feel
                warm and certain: clear guidance, a sketch you approve, a
                handcrafted frame you choose, and a gift box that arrives
                insured anywhere in the world.
              </p>
              <p>
                Cansoria exists for the people who want their companion&rsquo;s
                soul on the wall — not another mass-produced print.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream-dark/60 border-t border-border py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-serif text-2xl text-charcoal mb-8">
            Talk to the Studio
          </h2>

          <div className="space-y-6 text-sm text-charcoal-light font-light">
            <p className="leading-relaxed">
              Have a question about a photo, canvas size, memorial gift, or
              delivery timeline? Our studio team is here to help.
            </p>

            <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-6 border-y border-border">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-toffee" />
                <span>{COMPANY_INFO.supportEmail}</span>
              </div>
              <div className="hidden md:block w-[1px] h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-toffee" />
                <span>{COMPANY_INFO.address}</span>
              </div>
            </div>

            <p className="text-[10px] text-charcoal-muted max-w-lg mx-auto leading-relaxed">
              {COMPANY_INFO.name}. {COMPANY_INFO.studioNote} Secure checkout is
              provided through trusted payment processors.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
