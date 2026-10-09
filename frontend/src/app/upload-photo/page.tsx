import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO } from "@/lib/studio-content";
import PhotoUpload from "@/components/PhotoUpload";
import { StudioPage, StudioImage } from "@/components/StudioPage";
export const metadata: Metadata = {
  title: "Upload Your Pet Photo | Cansoria",
  description: "Upload a clear reference photo for your custom pet portrait.",
};
export default function UploadPhotoPage() {
  return (
    <StudioPage
      eyebrow="Your portrait starts here"
      title="Show us your favorite face."
      description="Prepare a clear reference and your preferred style. Uploading a photo does not reserve a commission; our service is in preparation."
    >
      <p className="studio-image-caption">{STUDIO.readiness}</p>
      <div className="studio-split">
        <div className="studio-card">
          <PhotoUpload />
          <Link
            href="/product/pet-portrait-oil-painting"
            className="studio-button mt-6"
          >
            Continue to Customize →
          </Link>
          <p>
            Your saved photo will appear in the customizer in this browser. Add
            the portrait to your cart to link it to your order.
          </p>
        </div>
        <div className="studio-copy">
          <StudioImage
            src="/images/pet-oil/original-photo.webp"
            alt="Reference photo concept of a golden retriever in natural light"
            caption="Reference concept"
          />
          <h2 className="mt-6">A few little photo tips.</h2>
          <p>
            Use soft daylight and focus on the eyes. Keep ears and face inside
            the frame. Choose the expression you love, and avoid heavy filters,
            screenshots or blurred photos.
          </p>
          <p>
            For multiple pets, mention your plans in the artist notes and{" "}
            <Link href="/contact">contact us</Link> about additional references.
          </p>
        </div>
      </div>
    </StudioPage>
  );
}
