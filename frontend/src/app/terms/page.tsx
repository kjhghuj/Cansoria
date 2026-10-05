import { COMPANY_INFO } from "@/lib/constants";

export const metadata = {
  title: "Terms & Conditions | Cansoria",
};

export default function TermsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8">
          Terms & Conditions
        </h1>

        <div className="prose prose-lg text-charcoal-light">
          <p className="text-sm text-gray-400">Last updated: January 2026</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Cansoria. By accessing our website or purchasing artwork,
            you agree to these terms and conditions.
          </p>

          <h2>2. Products</h2>
          <p>
            Product images, dimensions, colors, and descriptions are provided
            for guidance. Hand-painted artwork may include natural variations in
            brushwork, tone, and texture.
          </p>

          <h2>3. Custom Orders</h2>
          <p>
            Custom artwork is produced from customer-provided references or
            selected style directions. You are responsible for ensuring you have
            the right to use submitted photos.
          </p>

          <h2>4. Pricing</h2>
          <p>
            Prices are displayed in the currency configured for your region and
            may change without notice before an order is placed.
          </p>

          <h2>5. Payment</h2>
          <p>
            Payments are processed securely by trusted payment providers. We do
            not store full card details on our servers.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            Website content, brand assets, and original artwork presentations
            belong to Cansoria or their respective rights holders. Do not submit
            photos or references you are not permitted to use.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            Cansoria is not liable for indirect or consequential damages arising
            from use of the website, services, or products.
          </p>

          <p className="text-sm text-gray-400 mt-8">
            {COMPANY_INFO.name} | {COMPANY_INFO.address}
          </p>
        </div>
      </div>
    </div>
  );
}
