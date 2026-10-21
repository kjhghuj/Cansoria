import { STUDIO } from "@/lib/studio-content";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { serializeJsonLd } from "@/lib/security-json";
import "./globals.css";
import "./watch-home.css";
import "./studio.css";
import "./footer.css";
import { Providers } from "@/lib/providers";
import LayoutWrapper from "@/components/LayoutWrapper";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";

export const metadata: Metadata = {
  title: "Cansoria | Watch Concepts",
  description: STUDIO.description,
  keywords: [
    "watches",
    "automatic watch",
    "dress watch",
    "dive watch",
    "chronograph",
    "engraved watch",
    "watch gift",
  ],
  openGraph: {
    title: "Cansoria | Watch Concepts",
    description: STUDIO.description,
    type: "website",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com",
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
                  name: "Cansoria",
                  url:
                    process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com",
                  logo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com"}/brand/cansoria-wordmark.svg`,
                  sameAs: [
                    "https://facebook.com/cansoria",
                    "https://instagram.com/cansoria",
                    "https://pinterest.com/cansoria",
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
