import type { Metadata } from "next";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import "./globals.css";
import "./watch-home.css";
import "./studio.css";
import "./footer.css";
import "./florencess-fonts.css";
import "./florencess.css";
import "./florencess-catalog.css";
import { Providers } from "@/lib/providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";

export const metadata: Metadata = {
  title: "FLORENCESS | Affordable Online Shopping for Bags, Shoes & Clothing",
  description:
    "Shop the latest fashion trends at FLORENCESS! Explore stylish bags, shoes, and clothing at great prices. Fast shipping & easy returns.",
  keywords: [
    "FLORENCESS",
    "online fashion store",
    "bags",
    "shoes",
    "clothing",
    "affordable fashion",
    "womens fashion",
    "mens fashion",
    "shop online",
    "trendy accessories",
    "fashion deals",
  ],
  openGraph: {
    title: "FLORENCESS | Affordable Online Shopping for Bags, Shoes & Clothing",
    description:
      "Shop the latest fashion trends at FLORENCESS! Explore stylish bags, shoes, and clothing at great prices. Fast shipping & easy returns.",
    type: "website",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com",
  ),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // The chat API needs a model key, and in production its rate-limit/budget
  // admission additionally requires Redis — share the same condition the UI
  // displays and the API enforces.
  const chatEnabled =
    Boolean(process.env.GEMINI_API_KEY) &&
    (process.env.NODE_ENV !== "production" || Boolean(process.env.CHAT_REDIS_URL));
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <div className="flex flex-col min-h-screen font-sans text-charcoal bg-cream">
            <LayoutWrapper chatEnabled={chatEnabled}>{children}</LayoutWrapper>
            <script
              type="application/ld+json"
              nonce={nonce}
              // Browsers hide nonce attributes after parsing; the server value is intentional.
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: serializeJsonLd({
                  "@context": "https://schema.org",
                  "@type": "Organization",
                  name: "FLORENCESS",
                  url:
                    process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com",
                  logo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com"}/brand/cansoria-wordmark.svg`,
                  sameAs: [
                    "https://facebook.com/florencess",
                    "https://instagram.com/florencess",
                    "https://twitter.com/florencess",
                    "https://tiktok.com/@florencess",
                    "https://youtube.com/@florencess",
                  ],
                }),
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
