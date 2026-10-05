import { COMPANY_INFO } from "@/lib/constants";

export const metadata = {
  title: "Returns & Refunds | Cansoria",
};

export default function ReturnsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Returns & Refunds
        </h1>

        <div className="prose prose-lg text-charcoal-light">
          <h2>Custom Artwork</h2>
          <p>
            Custom paintings are made for your order, so returns may be limited
            once production has started. We use the preview step to help confirm
            the direction before shipping.
          </p>

          <h2>Damaged Shipments</h2>
          <p>
            If your artwork arrives damaged, contact us within 48 hours with
            your order number, photos of the packaging, and photos of the
            artwork. We will review and arrange a suitable resolution.
          </p>

          <h2>How to Contact Us</h2>
          <ol>
            <li>Email {COMPANY_INFO.supportEmail} with your order number</li>
            <li>Include photos if the issue is related to damage or quality</li>
            <li>Our team will reply with next steps</li>
          </ol>

          <h2>Refund Processing</h2>
          <p>
            Approved refunds are credited to the original payment method. Bank
            processing times may vary by card issuer or payment provider.
          </p>

          <p className="text-sm text-gray-400 mt-8">{COMPANY_INFO.name}</p>
        </div>
      </div>
    </div>
  );
}
