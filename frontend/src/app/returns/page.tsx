import type { Metadata } from "next";
import Link from "next/link";
import { STUDIO, STUDIO_OPEN } from "@/lib/studio-content";
import { getStoreOrdersOpen } from "@/lib/medusa";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ordersOpen = await getStoreOrdersOpen();
  return {
    title: "Returns & Refunds | Cansoria",
    description: ordersOpen
      ? "How Cansoria handles returns and refunds for standard and engraved watches."
      : "Cansoria service and returns arrangements will be confirmed before orders open.",
  };
}

export default async function ReturnsPage() {
  const ordersOpen = await getStoreOrdersOpen();
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Returns & Refunds
        </h1>
        <div className="prose prose-lg text-charcoal-light">
          <p>{ordersOpen ? STUDIO_OPEN.readiness : STUDIO.readiness}</p>
          {ordersOpen ? (
            <>
              <h2>Standard watches</h2>
              <p>
                If a watch arrives faulty or does not match your order, contact
                the studio with your order number and we will arrange a
                replacement or refund. Warranty claims are handled under the
                two-year international warranty listed on each product page.
              </p>
              <h2>Engraved watches</h2>
              <p>
                Caseback engraving is cut to order from the text you approve at
                checkout, so engraved watches cannot be resold. Engraved watches
                are returnable only when faulty or not as ordered — review your
                engraving text carefully before purchasing.
              </p>
            </>
          ) : (
            <>
              <h2>Service arrangements</h2>
              <p>
                Cancellation, returns, refunds and damaged-delivery procedures
                (including personalised engraved watches) have not yet been
                finalised. We will publish the applicable terms before accepting
                public orders.
              </p>
            </>
          )}
          <p>
            Please <Link href="/contact">contact us</Link> with questions about
            {ordersOpen ? " your order or" : " the planned service"}.
          </p>
        </div>
      </div>
    </div>
  );
}
