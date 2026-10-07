import type { Metadata } from "next";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import "./globals.css";
import "./portrait-home.css";
import { Providers } from "@/lib/providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";

export const metadata: Metadata = {
  title: "Cansoria | Custom Hand-Painted Pet Oil Portraits",
  description:
    "Bespoke pet oil portraits, 100% hand-painted by master artists on archival fine linen. Dog portraits, cat portraits, multi-pet family art, and memorial keepsakes — with a free digital proof before shipping.",
  keywords: [
    "custom pet portrait",
    "pet oil painting",
    "hand painted dog portrait",
    "hand painted cat portrait",
    "pet portrait from photo",
    "memorial pet painting",
    "multi pet portrait",
  ],
  openGraph: {
    title: "Cansoria | Custom Hand-Painted Pet Oil Portraits",
    description:
      "Turn your pet's photo into a museum-grade, hand-painted oil portrait. Free proof, unlimited revisions, insured worldwide delivery.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <div className="flex flex-col min-h-screen font-sans text-charcoal bg-cream">
            <LayoutWrapper>{children}</LayoutWrapper>
            <script
              type="application/ld+json"
              nonce={nonce}
              // Browsers hide nonce attributes after parsing; the server value is intentional.
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd({
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "Cansoria",
                  url: process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com",
                  logo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com"}/logo.png`,
                  sameAs: [
                    "https://facebook.com/cansoria",
                    "https://instagram.com/cansoria",
                    "https://pinterest.com/cansoria"
                  ]
                }),
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
