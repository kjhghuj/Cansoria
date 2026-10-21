import type { Metadata } from "next";
import Link from "next/link";
import { StudioPage, StudioCTA, StudioImage } from "@/components/StudioPage";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Watch Collections Gallery | Cansoria",
  description:
    "Explore illustrated watch collection concepts and find the case, dial and strap that fit your wrist.",
  alternates: { canonical: "/gallery" },
};
const models = [
  { name: "Heritage Classic 40", handle: "heritage-classic-40", tag: "Dress watch" },
  { name: "Meridian Automatic", handle: "meridian-automatic", tag: "Automatic" },
  { name: "Regent Chronograph", handle: "regent-chronograph", tag: "Chronograph" },
  { name: "Averly Dress Watch", handle: "averly-dress-watch", tag: "Mother-of-pearl dial" },
  { name: "Northsea Diver", handle: "northsea-diver", tag: "20 ATM dive watch" },
  { name: "Lucienne Slim 32", handle: "lucienne-slim-32", tag: "Ultra-thin" },
];
export default function GalleryPage() {
  return (
    <StudioPage
      eyebrow="Collection inspiration"
      title="Imagine the watch on your wrist."
      description="These design illustrations explore possible cases, dials and straps. They are not delivered customer watches."
    >
      <div className="studio-grid studio-gallery">
        {models.map((model) => (
          <figure key={model.handle}>
            <Link
              href={"/product/" + model.handle}
              aria-label={"Explore the " + model.name + " concept"}
            >
              <StudioImage
                src={"/images/watches/" + model.handle + ".svg"}
                alt={model.name + " collection concept"}
              />
            </Link>
            <figcaption>
              <h3>{model.name}</h3>
              <p>{STUDIO.illustration}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <StudioCTA />
    </StudioPage>
  );
}
