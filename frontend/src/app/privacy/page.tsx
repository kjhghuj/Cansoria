import { COMPANY_INFO } from "@/lib/constants";

export const metadata = {
  title: "Privacy Policy | Cansoria",
};

export default function PrivacyPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-lg text-charcoal-light">
          <p className="text-sm text-gray-400">Last updated: January 2026</p>

          <h2>Your Privacy Matters</h2>
          <p>
            Cansoria uses customer information to process orders, create custom
            artwork, provide support, and send updates you request.
          </p>

          <h2>Information We Collect</h2>
          <ul>
            <li>Name and contact details for order processing</li>
            <li>Delivery address</li>
            <li>Payment information handled by secure payment providers</li>
            <li>Photos or references submitted for custom artwork</li>
            <li>Email preferences for offers or studio updates</li>
          </ul>

          <h2>How We Use Your Data</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Process and deliver orders</li>
            <li>Create and review custom artwork</li>
            <li>Send order confirmations and shipping updates</li>
            <li>Provide customer support</li>
            <li>Send marketing communications only when permitted</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect
            customer information. Payment data is handled by payment processors.
          </p>

          <h2>Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct,
            delete, or restrict use of your personal information.
          </p>

          <h2>Contact Us</h2>
          <p>
            For privacy-related questions, contact us at{" "}
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="text-terracotta">
              {COMPANY_INFO.supportEmail}
            </a>
          </p>

          <p className="text-sm text-gray-400 mt-8">
            {COMPANY_INFO.name} | {COMPANY_INFO.address}
          </p>
        </div>
      </div>
    </div>
  );
}
