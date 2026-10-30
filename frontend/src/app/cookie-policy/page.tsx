import { StaticPage } from "@/components/florencess";
import { FL_STATIC_PAGES } from "@/lib/florencess-pages";
import type { Metadata } from "next";

const page = FL_STATIC_PAGES["cookie-policy"];

export const metadata: Metadata = {
  title: "Cookie Policy | FLORENCESS",
  description:
    "How FLORENCESS uses cookies, the types of cookies we rely on, and how you can manage or disable them in your browser.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: {
    title: "Cookie Policy | FLORENCESS",
    description:
      "How FLORENCESS uses cookies, the types of cookies we rely on, and how you can manage or disable them in your browser.",
    url: "/cookie-policy",
    images: [{ url: "/florencess/img/hero-936.webp", alt: "FLORENCESS" }],
    type: "article",
  },
};

export default function CookiePolicyPage() {
  return <StaticPage page={page} />;
}