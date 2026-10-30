import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";

const page = FL_STATIC_PAGES["privacy-policy"];

export const metadata: Metadata = {
  title: "Privacy Policy | FLORENCESS",
  description:
    "How FLORENCESS collects, uses, shares and protects your personal information, and the rights you have over your data.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | FLORENCESS",
    description:
      "How FLORENCESS collects, uses, shares and protects your personal information, and the rights you have over your data.",
    url: "/privacy-policy",
    images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS" }],
    type: "article",
  },
};

export default function PrivacyPolicyPage() {
  return <StaticPage page={page} />;
}