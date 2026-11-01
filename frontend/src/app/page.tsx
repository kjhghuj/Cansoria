import { FlorencessHome } from "@/components/florencess";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description:
      SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/florencess/img/hero-936.webp", alt: SITE_NAME }],
    type: "website",
  },
};

export default function HomePage() {
  return <FlorencessHome />;
}
