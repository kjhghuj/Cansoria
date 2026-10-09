import { CardElement } from "@stripe/react-stripe-js";
import { CountrySelect } from "./CountrySelect";
import type { StoreRegion } from "@/lib/types";
import type { DeliveryDetails } from "@/lib/checkout-delivery";

export type BillingData = DeliveryDetails;

export interface CardData {
  name: string;
}

interface ContactFormProps {
  billingData: BillingData;
  setBillingData: (data: BillingData) => void;
  cardData: CardData;
  setCardData: (data: CardData) => void;
  countries: NonNullable<StoreRegion["countries"]>;
  showPayment: boolean;
  onCardReady: (ready: boolean) => void;
}

const inputClass =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-charcoal placeholder:text-charcoal-muted focus:outline-none focus:border-toffee focus:ring-2 focus:ring-toffee/15 transition-colors";

const labelClass = "block text-xs uppercase tracking-widest text-charcoal mb-2";

function NumberedCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-cream-light p-6 sm:p-8 shadow-[0_4px_20px_rgba(38,34,30,0.05)]">
      <div className="mb-6 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-toffee font-serif text-lg font-semibold text-white shadow-[0_6px_16px_rgba(176,141,79,0.30)]"
        >
          {step}
        </span>
        <div>
          <h2 className="font-serif text-xl text-charcoal leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-charcoal-light">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ContactForm({
  billingData,
  setBillingData,
  cardData,
  setCardData,
  countries,
  showPayment,
  onCardReady,
}: ContactFormProps) {
  return (
    <div className="space-y-6">
      <NumberedCard
        step={1}
        title="Contact"
        subtitle="We will use this email to send your order updates and artwork preview."
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-email" className={labelClass}>
              Email
            </label>
            <input
              id="checkout-email"
              autoComplete="email"
              type="email"
              value={billingData.email}
              onChange={(e) =>
                setBillingData({ ...billingData, email: e.target.value })
              }
              className={inputClass}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkout-name" className={labelClass}>
                Name
              </label>
              <input
                id="checkout-name"
                autoComplete="shipping name"
                type="text"
                value={billingData.name}
                onChange={(e) =>
                  setBillingData({ ...billingData, name: e.target.value })
                }
                className={inputClass}
                placeholder="Full Name"
                required
              />
            </div>
            <div>
              <label htmlFor="checkout-phone" className={labelClass}>
                Phone Number
              </label>
              <input
                id="checkout-phone"
                autoComplete="shipping tel"
                type="tel"
                value={billingData.phone}
                onChange={(e) =>
                  setBillingData({ ...billingData, phone: e.target.value })
                }
                className={inputClass}
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
          </div>
        </div>
      </NumberedCard>

      <NumberedCard step={2} title="Shipping Address">
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-address" className={labelClass}>
              Address
            </label>
            <textarea
              id="checkout-address"
              autoComplete="shipping street-address"
              value={billingData.address}
              onChange={(e) =>
                setBillingData({ ...billingData, address: e.target.value })
              }
              className={`${inputClass} min-h-[80px]`}
              placeholder="Street address"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="checkout-city" className={labelClass}>
                City
              </label>
              <input
                id="checkout-city"
                autoComplete="shipping address-level2"
                type="text"
                value={billingData.city}
                onChange={(e) =>
                  setBillingData({ ...billingData, city: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="checkout-postcode" className={labelClass}>
                Postal Code
              </label>
              <input
                id="checkout-postcode"
                autoComplete="shipping postal-code"
                type="text"
                value={billingData.postalCode}
                onChange={(e) =>
                  setBillingData({ ...billingData, postalCode: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="checkout-country" className={labelClass}>
              Country
            </label>
            <CountrySelect
              value={billingData.country}
              onChange={(val) =>
                setBillingData({ ...billingData, country: val })
              }
              required
              countries={countries}
            />
          </div>
        </div>
      </NumberedCard>

      {showPayment && (
        <NumberedCard
          step={3}
          title="Payment"
          subtitle="Your payment is processed securely. Your painting preview is sent before the artwork ships."
        >
          <div className="space-y-4">
            <div>
              <p className={labelClass}>Card Information</p>
              <div className="rounded-xl border border-border bg-white px-4 py-3 focus-within:border-toffee focus-within:ring-2 focus-within:ring-toffee/15 transition-colors">
                <CardElement
                  onChange={(event) =>
                    onCardReady(event.complete && !event.error)
                  }
                  options={{
                    hidePostalCode: true,
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#26221E",
                        "::placeholder": { color: "#9C8E7F" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="checkout-cardholder" className={labelClass}>
                Cardholder Name
              </label>
              <input
                id="checkout-cardholder"
                autoComplete="cc-name"
                type="text"
                value={cardData.name}
                onChange={(e) =>
                  setCardData({ ...cardData, name: e.target.value })
                }
                className={inputClass}
                placeholder="Name on card"
                required
              />
            </div>
          </div>
        </NumberedCard>
      )}
    </div>
  );
}
