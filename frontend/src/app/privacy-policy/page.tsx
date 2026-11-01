import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";
import { SITE_NAME, pageTitle } from "@/lib/brand";

const page = FL_STATIC_PAGES["privacy-policy"];

export const metadata: Metadata = {
  title: pageTitle("Privacy Policy"),
  description:
    `How ${SITE_NAME} collects, uses, shares and protects your personal information, and the rights you have over your data.`,
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: pageTitle("Privacy Policy"),
    description:
      `How ${SITE_NAME} collects, uses, shares and protects your personal information, and the rights you have over your data.`,
    url: "/privacy-policy",
    images: [{ url: "/florencess/img/hero-936.webp", alt: SITE_NAME }],
    type: "article",
  },
};

export default function PrivacyPolicyPage() {
  return <StaticPage page={page} />;
}