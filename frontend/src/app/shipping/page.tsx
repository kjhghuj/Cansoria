import { COMPANY_INFO } from "@/lib/constants";

export const metadata = {
  title: "Shipping & Delivery | Cansoria",
};

export default function ShippingPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Shipping & Delivery
        </h1>

        <div className="prose prose-lg text-charcoal-light">
          <h2>Production Times</h2>
          <p>
            Custom paintings are made to order. Production timing depends on
            canvas size, detail level, and current studio capacity.
          </p>

          <h2>Preview Before Shipping</h2>
          <p>
            For custom artwork, we provide a preview before the piece ships so
            you can review the overall direction and presentation.
          </p>

          <h2>Delivery</h2>
          <p>
            Available shipping methods and rates are shown in cart based on
            your delivery address. Tracking details are sent once your order is
            ready to leave the studio.
          </p>

          <h2>Artwork Packaging</h2>
          <p>
            Paintings are protected with careful packaging suited for canvas
            artwork. If a shipment arrives damaged, keep the packaging and
            contact us with photos within 48 hours.
          </p>

          <h2>Contact</h2>
          <p>
            For shipping questions, contact us at{" "}
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="text-terracotta">
              {COMPANY_INFO.supportEmail}
            </a>
          </p>

          <p className="text-sm text-gray-400 mt-8">{COMPANY_INFO.name}</p>
        </div>
      </div>
    </div>
  );
}
