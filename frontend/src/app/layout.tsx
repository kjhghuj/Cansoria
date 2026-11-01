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
import "./lorencess-features.css";
import { Providers } from "@/lib/providers";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/brand";
import LayoutWrapper from "@/components/LayoutWrapper";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    SITE_DESCRIPTION,
  keywords: [
    SITE_NAME,
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
    title: SITE_NAME,
    description:
      SITE_DESCRIPTION,
    type: "website",
  },
  metadataBase: new URL(siteUrl()),
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
                  name: SITE_NAME,
                  url: siteUrl(),
                }),
              }}
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
