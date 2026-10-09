import Link from "next/link";
import type { StoreProduct } from "@/lib/types";
import { STUDIO } from "@/lib/studio-content";
export default function ProductInfo({ product }: { product: StoreProduct }) {
  const questions = [
    {
      title: "How should I choose a reference?",
      text: "Use natural light, keep the eyes and expression in focus, and include the full face and ears. Note the expression and small details you want to preserve.",
    },
    {
      title: "How can I prepare my photo?",
      text:
        product.handle === "pet-portrait-oil-painting"
          ? "The customizer and Photo Guide support private JPG, PNG and WebP uploads up to 10 MB. A saved reference, chosen style and notes stay together. Uploading a photo does not reserve a commission."
          : "Gather a clear reference and describe the composition you have in mind. Contact us to discuss the planned service.",
    },
    {
      title: "Can I prepare an idea for several pets or an older photo?",
      text: "Collect your references and write down the details that matter. We can discuss your idea, but production availability and the requirements for each commission are still being determined.",
    },
    {
      title: "What should I include in my notes?",
      text: "Describe the background, preferred colours, pose, collars, toys or other meaningful details. Keep the original photo alongside your notes so your preferences are clear.",
    },
    {
      title: "How should I think about size and framing?",
      text: "Measure your wall space and consider the room and viewing distance. Final canvas and framing specifications will be confirmed before commissions open.",
    },
  ];
  return (
    <section className="mt-16 grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
          Photo & Preferences
        </p>
        <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
          Preparing the Details That Matter
        </h2>
        <p className="mt-4 text-sm leading-7 text-charcoal-light">
          {STUDIO.readiness}
        </p>
      </div>
      <div className="studio-faq m-0 w-full">
        {questions.map((item, index) => (
          <details key={item.title} open={index === 0}>
            <summary>{item.title}</summary>
            <p>{item.text}</p>
          </details>
        ))}
        <p className="mt-6">
          <Link href="/upload-photo" className="underline">
            Photo Guide →
          </Link>{" "}
          ·{" "}
          <Link href="/contact" className="underline">
            Contact Us →
          </Link>
        </p>
      </div>
    </section>
  );
}
