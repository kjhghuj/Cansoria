import { FlorencessHome } from "@/components/florencess";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FLORENCESS | Affordable Online Shopping for Bags, Shoes & Clothing",
  description:
    "Shop the latest fashion trends at FLORENCESS! Explore stylish bags, shoes, and clothing at great prices. Fast shipping & easy returns.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "FLORENCESS | Affordable Online Shopping for Bags, Shoes & Clothing",
    description:
      "Shop the latest fashion trends at FLORENCESS! Explore stylish bags, shoes, and clothing at great prices. Fast shipping & easy returns.",
    url: "/",
    images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS warehouse sale" }],
    type: "website",
  },
};

export default function HomePage() {
  return <FlorencessHome />;
}
