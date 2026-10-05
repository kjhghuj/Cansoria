import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import ExitIntentPopup from "@/components/ExitIntentPopup";

export const metadata: Metadata = {
  title: "Cansoria | Custom Hand-Painted Oil Paintings",
  description:
    "Turn your favorite photos into museum-quality hand-painted oil paintings. Custom portraits, pet paintings, wedding gifts, and home decor canvas art.",
  keywords: [
    "custom oil painting",
    "hand painted portrait",
    "photo to painting",
    "pet portrait",
    "wedding painting",
    "canvas wall art",
    "home decor art",
  ],
  openGraph: {
    title: "Cansoria | Custom Hand-Painted Oil Paintings",
    description:
      "Turn your favorite photos into museum-quality hand-painted oil paintings. Custom portraits, pet paintings, wedding gifts, and home decor canvas art.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <div className="flex flex-col min-h-screen font-sans text-charcoal bg-cream">
            <LayoutWrapper>{children}</LayoutWrapper>
            <ExitIntentPopup />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
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
