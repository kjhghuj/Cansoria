import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO } from "@/lib/studio-content";
export const metadata: Metadata = {
  title: "Returns & Refunds | Cansoria",
  description:
    "Cansoria service and returns arrangements will be confirmed before commissions open.",
};
export default function ReturnsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Returns & Refunds
        </h1>
        <div className="prose prose-lg text-charcoal-light">
          <p>{STUDIO.readiness}</p>
          <h2>Service arrangements</h2>
          <p>
            Cancellation, revisions, returns, refunds and damaged-delivery
            procedures have not yet been finalised. We will publish the
            applicable terms before accepting public orders.
          </p>
          <p>
            Please <Link href="/contact">contact us</Link> with questions about
            the planned service.
          </p>
        </div>
      </div>
    </div>
  );
}
