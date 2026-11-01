import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";
import { SITE_NAME, pageTitle } from "@/lib/brand";

const page = FL_STATIC_PAGES["about-us"];

export const metadata: Metadata = {
  title: pageTitle("About Us"),
  description:
    `About ${SITE_NAME}: who we are and how to reach us.`,
  alternates: { canonical: "/about-us" },
  openGraph: {
    title: pageTitle("About Us"),
    description:
      `About ${SITE_NAME}: who we are and how to reach us.`,
    url: "/about-us",
    images: [{ url: "/florencess/img/hero-936.webp", alt: SITE_NAME }],
    type: "article",
  },
};

export default function AboutUsPage() {
  return <StaticPage page={page} />;
}