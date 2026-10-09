import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Shipping & Delivery | Cansoria",
  description:
    "Cansoria delivery arrangements are in preparation and will be confirmed before commissions open.",
};
export default function ShippingPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Shipping & Delivery
        </h1>
        <div className="prose prose-lg text-charcoal-light">
          <p>{STUDIO.readiness}</p>
          <h2>Production and dispatch</h2>
          <p>
            Production locations, dispatch locations and lead times have not yet
            been finalised. We will confirm them before commissions open.
          </p>
          <h2>Destinations and costs</h2>
          <p>
            Supported destinations, delivery methods, shipping charges and any
            insurance arrangements are still being determined. Delivery
            availability and charges will be confirmed before orders open.
          </p>
          <h2>Packaging and tracking</h2>
          <p>
            Packaging specifications, tracking arrangements and the procedure
            for reporting delivery issues will be published once confirmed.
          </p>
          <p>
            Have a question? <Link href="/contact">Contact Us →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
