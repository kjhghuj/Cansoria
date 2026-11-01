import type { Metadata } from "next";
import Link from "next/link";
import { FL_CONTACT } from "@/lib/florencess-content";
import { SITE_NAME, pageTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: pageTitle("Contact Us"),
  description: `Our location and telephone numbers at ${SITE_NAME}.`,
  alternates: { canonical: "/contact" },
};

/**
 * The reference contact page publishes a location and two telephone numbers and
 * carries no contact form, so none is rendered here. The order-help routes that
 * do exist are linked instead.
 */
export default function ContactPage() {
  return (
    <>
      <div className="fl-listing__head">
        <h1 className="fl-listing__title">Contact Us</h1>
      </div>

      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>Contact Us</li>
        </ol>
      </div>

      <div className="fl-container">
        <div className="fl-info">
          <div className="fl-info__row">
            <span className="fl-info__label">Our Location</span>
            <span className="fl-info__value">{FL_CONTACT.address}</span>
          </div>

          <div className="fl-info__row">
            <span className="fl-info__label">Telephone</span>
            <span className="fl-info__value">
              <a className="fl-info__link" href={`tel:${FL_CONTACT.phone.replace(/[^+0-9]/g, "")}`}>
                {FL_CONTACT.phone}
              </a>
            </span>
          </div>

          <div className="fl-info__row">
            <span className="fl-info__label">Customer Care</span>
            <span className="fl-info__value">
              <a className="fl-info__link" href={`tel:${FL_CONTACT.carePhone.replace(/[^+0-9]/g, "")}`}>
                {FL_CONTACT.carePhone}
              </a>
            </span>
          </div>

          <div className="fl-info__row">
            <span className="fl-info__label">Order Help</span>
            <span className="fl-info__value">
              <Link className="fl-info__link" href="/order-tracking">
                Track an order
              </Link>{" "}
              ·{" "}
              <Link className="fl-info__link" href="/faq">
                Read the FAQ
              </Link>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
