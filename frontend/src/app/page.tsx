import { PortraitHome } from "./components/home/PortraitHome";
import type { Metadata } from "next";
import { STUDIO } from "@/lib/studio-content";

export const metadata: Metadata = {
  title: "Cansoria | Pet Portrait Concepts",
  description: STUDIO.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Cansoria | Pet Portrait Concepts",
    description: STUDIO.description,
    url: "/",
    images: [{ url: "/images/home/hero-room.png", alt: STUDIO.scene }],
    type: "website",
  },
};

export default function HomePage() {
  return <PortraitHome />;
}
