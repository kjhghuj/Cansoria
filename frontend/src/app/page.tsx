import { WatchHome } from "./components/home/WatchHome";
import type { Metadata } from "next";
import { getStoreOrdersOpen } from "@/lib/medusa";
import { STUDIO, STUDIO_OPEN, studioHomeTitle } from "@/lib/studio-content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ordersOpen = await getStoreOrdersOpen();
  const description = ordersOpen ? STUDIO_OPEN.description : STUDIO.description;
  return {
    title: studioHomeTitle(ordersOpen),
    description,
    alternates: { canonical: "/" },
    openGraph: {
      title: studioHomeTitle(ordersOpen),
      description,
      url: "/",
      images: [{ url: "/images/watches/hero.svg", alt: STUDIO.scene }],
      type: "website",
    },
  };
}

export default async function HomePage() {
  const ordersOpen = await getStoreOrdersOpen();
  return <WatchHome ordersOpen={ordersOpen} />;
}
