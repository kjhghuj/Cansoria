import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";

const page = FL_STATIC_PAGES["terms-conditions"];

export const metadata: Metadata = {
  title: "Terms & Conditions | FLORENCESS",
  description:
    "The terms and conditions governing use of the FLORENCESS website and the purchase of our products.",
  alternates: { canonical: "/terms-conditions" },
  openGraph: {
    title: "Terms & Conditions | FLORENCESS",
    description:
      "The terms and conditions governing use of the FLORENCESS website and the purchase of our products.",
    url: "/terms-conditions",
    images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS" }],
    type: "article",
  },
};

export default function TermsConditionsPage() {
  return <StaticPage page={page} />;
}