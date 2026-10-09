import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { StudioPage } from "@/components/StudioPage";
import { STUDIO } from "@/lib/studio-content";
import { COMPANY_INFO } from "@/lib/constants";
export const metadata: Metadata = {
  title: "Contact the Studio | Cansoria",
  description: "Get help with your pet reference photo, portrait or order.",
};
export default function ContactPage() {
  return (
    <StudioPage
      eyebrow="Here to help"
      title="Let’s talk about your portrait."
      description="A question about your reference, a special gift or the planned service? Share your ideas with us."
    >
      <div className="studio-split">
        <section className="studio-copy">
          <h2>A little guidance goes a long way.</h2>
          <p>{STUDIO.readiness}</p>
          <p>
            Email{" "}
            <a href={`mailto:${COMPANY_INFO.supportEmail}`}>
              {COMPANY_INFO.supportEmail}
            </a>{" "}
            or use the form. For an existing order, include your order number in
            your message.
          </p>
          <p>
            <Link href="/faq">Browse frequently asked questions →</Link>
          </p>
          <p>
            <Link href="/order/lookup">Look up your order →</Link>
          </p>
          <p className="text-sm">
            Your contact details are used to respond to your inquiry. Read our{" "}
            <Link href="/privacy">privacy policy</Link>.
          </p>
        </section>
        <section className="studio-card">
          <ContactForm />
        </section>
      </div>
    </StudioPage>
  );
}
