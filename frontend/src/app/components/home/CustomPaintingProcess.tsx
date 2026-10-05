import { Eye, ImageUp, Paintbrush, Ruler } from "lucide-react";

const steps = [
  {
    icon: <ImageUp size={24} />,
    title: "Upload Your Photo",
    text: "Choose a portrait, pet, wedding moment, or family memory with clear light and expression.",
  },
  {
    icon: <Ruler size={24} />,
    title: "Choose Size & Style",
    text: "Select the canvas size and visual mood that fits your room, gift, or keepsake.",
  },
  {
    icon: <Paintbrush size={24} />,
    title: "Artist Paints by Hand",
    text: "A real artist builds the image in layers with oil paint, brushwork, and canvas texture.",
  },
  {
    icon: <Eye size={24} />,
    title: "Preview & Delivery",
    text: "Review a digital preview before your finished painting is carefully packed and shipped.",
  },
];

export function CustomPaintingProcess() {
  return (
    <section className="bg-cream py-20 lg:py-28">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mb-12 lg:mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-charcoal leading-tight mb-4">
            How Your Custom Painting Is Made
          </h2>
          <p className="text-charcoal-light font-light leading-relaxed">
            A simple, calm process designed for custom artwork you can approve
            before it leaves the studio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-y border-border">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="py-8 sm:px-6 lg:px-8 border-b sm:border-b-0 lg:border-l border-border first:border-l-0"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="font-serif text-4xl text-terracotta/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-terracotta">{step.icon}</span>
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-charcoal-light leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
