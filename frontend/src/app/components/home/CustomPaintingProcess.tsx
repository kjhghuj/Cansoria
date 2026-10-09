import { PREPARATION_STEPS } from "@/lib/studio-content";
import { ImageUp, Paintbrush, PackageCheck } from "lucide-react";

const stepIcons = [
  <ImageUp key="photo" size={22} />,
  <Paintbrush key="style" size={22} />,
  <PackageCheck key="details" size={22} />,
];
const steps = PREPARATION_STEPS.map((step, index) => ({
  ...step,
  icon: stepIcons[index],
  caption: step.link,
}));

export function CustomPaintingProcess() {
  return (
    <section id="process" className="bg-cream py-20 lg:py-28 scroll-mt-24">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-12 lg:mb-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-toffee mb-4">
            Wonderfully simple
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
            Prepare Your Portrait in 3 Simple Steps
          </h2>
          <p className="text-charcoal-light font-light leading-relaxed">
            Explore styles, prepare a photo and discuss your ideas while our
            commissioning service is in preparation.
          </p>
        </div>

        <div className="relative">
          {/* Caramel connector line (desktop) */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-toffee/10 via-toffee/45 to-toffee/10"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative rounded-2xl bg-white border border-border-subtle p-8 shadow-[0_6px_24px_rgba(38,34,30,0.05)]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-toffee text-white shadow-[0_8px_20px_rgba(176,141,79,0.35)]">
                    {step.icon}
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-charcoal text-champagne-gold text-[11px] font-bold font-sans">
                      {index + 1}
                    </span>
                  </span>
                  <span className="font-serif text-4xl text-toffee/25 leading-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-serif text-xl lg:text-2xl text-charcoal mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-charcoal-light leading-relaxed mb-5">
                  {step.text}
                </p>
                <p className="inline-flex text-[11px] font-semibold uppercase tracking-widest text-toffee border-b border-toffee/30 pb-1">
                  {step.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
