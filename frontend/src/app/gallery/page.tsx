import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Pet Portrait Style Gallery | Cansoria",
  description:
    "Explore illustrated pet portrait concepts and find inspiration for your preferred style.",
  alternates: { canonical: "/gallery" },
};
const portraits = [
  { breed: "Golden Retriever", image: "milo", style: "classic-oil" },
  { breed: "Ragdoll Cat", image: "luna", style: "soft-impression" },
  { breed: "French Bulldog", image: "charlie", style: "dark-classic" },
  { breed: "Tabby Cat", image: "bella", style: "classic-oil" },
  { breed: "Cavalier King Charles", image: "cooper", style: "textured-oil" },
  { breed: "Poodle", image: "daisy", style: "soft-impression" },
];
export default function GalleryPage() {
  return (
    <StudioPage
      eyebrow="Style inspiration"
      title="Imagine a familiar face in art."
      description="These design illustrations explore possible moods and compositions. They are not completed customer commissions."
    >
      <div className="studio-grid studio-gallery">
        {portraits.map((pet) => (
          <figure key={pet.image}>
            <Link
              href={"/product/pet-portrait-oil-painting?style=" + pet.style}
              aria-label={"Explore a " + pet.breed + " portrait concept"}
            >
              <StudioImage
                src={"/images/home/" + pet.image + ".webp"}
                alt={pet.breed + " portrait concept"}
              />
            </Link>
            <figcaption>
              <h3>{pet.breed}</h3>
              <p>{STUDIO.illustration}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <StudioCTA />
    </StudioPage>
  );
}
