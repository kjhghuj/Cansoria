import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO, STUDIO_OPEN } from "@/lib/studio-content";
import { getStoreOrdersOpen } from "@/lib/medusa";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ordersOpen = await getStoreOrdersOpen();
  return {
    title: "Shipping & Delivery | Cansoria",
    description: ordersOpen
      ? "Tracked, insured delivery options and costs are calculated at checkout based on your address."
      : "Cansoria delivery arrangements are in preparation and will be confirmed before orders open.",
  };
}

export default async function ShippingPage() {
  const ordersOpen = await getStoreOrdersOpen();
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Shipping & Delivery
        </h1>
        <div className="prose prose-lg text-charcoal-light">
          <p>{ordersOpen ? STUDIO_OPEN.readiness : STUDIO.readiness}</p>
          {ordersOpen ? (
            <>
              <h2>Delivery options and costs</h2>
              <p>
                Standard and Priority tracked delivery options and their costs
                are calculated at checkout based on your delivery address.
                Orders ship insured; a delivery confirmation with tracking is
                emailed once your watch leaves the studio.
              </p>
              <h2>Before dispatch</h2>
              <p>
                Every watch is regulated and checked — including any caseback
                engraving — before it is boxed with its warranty card and strap
                tool.
              </p>
            </>
          ) : (
            <>
              <h2>Production and dispatch</h2>
              <p>
                Dispatch locations and lead times have not yet been finalised.
                We will confirm them before orders open.
              </p>
              <h2>Destinations and costs</h2>
              <p>
                Supported destinations, delivery methods, shipping charges and
                insurance arrangements are still being determined, and will be
                confirmed before orders open.
              </p>
              <h2>Packaging and tracking</h2>
              <p>
                Packaging specifications, tracking arrangements and the
                procedure for reporting delivery issues will be published once
                confirmed.
              </p>
            </>
          )}
          <p>
            Have a question? <Link href="/contact">Contact Us →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
