import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";
import { SITE_NAME, pageTitle } from "@/lib/brand";

const page = FL_STATIC_PAGES["shipping-policy"];

export const metadata: Metadata = {
  title: pageTitle("Shipping Policy"),
  description:
    `${SITE_NAME} shipping policy: processing times, shipping methods and rates, delivery times, customs duties and order tracking.`,
  alternates: { canonical: "/shipping-policy" },
  openGraph: {
    title: pageTitle("Shipping Policy"),
    description:
      `${SITE_NAME} shipping policy: processing times, shipping methods and rates, delivery times, customs duties and order tracking.`,
    url: "/shipping-policy",
    images: [{ url: "/florencess/img/hero-936.webp", alt: SITE_NAME }],
    type: "article",
  },
};

export default function ShippingPolicyPage() {
  return <StaticPage page={page} />;
}