import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";
import { SITE_NAME, pageTitle } from "@/lib/brand";

const page = FL_STATIC_PAGES["terms-conditions"];

export const metadata: Metadata = {
  title: pageTitle("Terms & Conditions"),
  description:
    `The terms and conditions governing use of the ${SITE_NAME} website and the purchase of our products.`,
  alternates: { canonical: "/terms-conditions" },
  openGraph: {
    title: pageTitle("Terms & Conditions"),
    description:
      `The terms and conditions governing use of the ${SITE_NAME} website and the purchase of our products.`,
    url: "/terms-conditions",
    images: [{ url: "/florencess/img/hero-936.webp", alt: SITE_NAME }],
    type: "article",
  },
};

export default function TermsConditionsPage() {
  return <StaticPage page={page} />;
}