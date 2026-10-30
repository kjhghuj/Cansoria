import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";

const page = FL_STATIC_PAGES["about-us"];

export const metadata: Metadata = {
  title: "About Us | FLORENCESS",
  description:
    "FLORENCESS is a mindful fashion label creating apparel, bags and footwear for the modern city woman — thoughtfully made, responsibly sourced.",
  alternates: { canonical: "/about-us" },
  openGraph: {
    title: "About Us | FLORENCESS",
    description:
      "FLORENCESS is a mindful fashion label creating apparel, bags and footwear for the modern city woman — thoughtfully made, responsibly sourced.",
    url: "/about-us",
    images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS" }],
    type: "article",
  },
};

export default function AboutUsPage() {
  return <StaticPage page={page} />;
}