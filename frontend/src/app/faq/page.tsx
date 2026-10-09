import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA } from "@/components/StudioPage";
import { STUDIO_FAQ } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Frequently Asked Questions | Cansoria",
  description:
    "Photo guidance, style concepts and the current preparation status of Cansoria commissions.",
  alternates: { canonical: "/faq" },
};
const photoQuestions = [
  {
    title: "What kind of photo should I prepare?",
    text: "Choose a clear photo in natural light with the eyes and expression in focus. The photo uploader supports JPG, PNG and WebP files up to 10 MB. Export HEIC photos as JPG first.",
  },
  {
    title: "How do I choose a style?",
    text: "Compare Classic Oil, Soft Impression, Textured Oil and Dark Classic in Pet Portraits. These illustrations help you describe your preferred colours, mood and background.",
  },
  {
    title: "How is my uploaded photo stored?",
    text: "An uploaded reference is stored privately. In the customizer, your saved photo, style and notes stay together. Uploading a photo does not reserve a commission or confirm production.",
  },
  {
    title: "Can I prepare ideas for several pets or a memorial portrait?",
    text: "Yes. Gather the photos and note the details or memories you want to preserve. Contact us to discuss your ideas; availability has not yet been confirmed.",
  },
];
export default function FAQPage() {
  return (
    <StudioPage
      eyebrow="A few helpful answers"
      title="Before the first brushstroke."
      description="Explore the concepts, prepare a reference and understand what is still being determined."
    >
      <div className="studio-faq">
        {[...STUDIO_FAQ, ...photoQuestions].map((item) => (
          <details key={item.title}>
            <summary>{item.title}</summary>
            <p>{item.text}</p>
          </details>
        ))}
        <details>
          <summary>Where can I find service and delivery information?</summary>
          <p>
            Read our <Link href="/shipping">delivery information</Link> and{" "}
            <Link href="/returns">returns information</Link>. These arrangements
            will be confirmed before orders open.
          </p>
        </details>
        <p className="mt-8">
          Still have a question? <Link href="/contact">Contact Us →</Link>
        </p>
      </div>
      <StudioCTA />
    </StudioPage>
  );
}
