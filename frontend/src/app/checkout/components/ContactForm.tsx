import { CardElement } from "@stripe/react-stripe-js";
import { CountrySelect } from "./CountrySelect";

export interface BillingData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface CardData {
  name: string;
}

interface ContactFormProps {
  billingData: BillingData;
  setBillingData: (data: BillingData) => void;
  cardData: CardData;
  setCardData: (data: CardData) => void;
}

export function ContactForm({ billingData, setBillingData, cardData, setCardData }: ContactFormProps) {
  return (
    <>
      <div className="mb-8">
        <h2 className="font-serif text-xl text-charcoal mb-4">Contact Information</h2>
        <p className="mb-5 text-sm leading-6 text-charcoal-light">
          We will use this email to send your order updates and artwork preview.
        </p>
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Name</label>
              <input
                type="text"
                value={billingData.name}
                onChange={(e) => setBillingData({ ...billingData, name: e.target.value })}
                className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
                placeholder="Full Name"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Phone Number</label>
              <input
                type="tel"
                value={billingData.phone}
                onChange={(e) => setBillingData({ ...billingData, phone: e.target.value })}
                className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
                placeholder="+1 (555) 000-0000"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Email</label>
            <input
              type="email"
              value={billingData.email}
              onChange={(e) => setBillingData({ ...billingData, email: e.target.value })}
              className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <h2 className="font-serif text-xl text-charcoal mb-4">Delivery Address</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Address</label>
            <textarea
              value={billingData.address}
              onChange={(e) => setBillingData({ ...billingData, address: e.target.value })}
              className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta min-h-[80px]"
              placeholder="Street address"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">City</label>
              <input
                type="text"
                value={billingData.city}
                onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
                className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Postal Code</label>
              <input
                type="text"
                value={billingData.postalCode}
                onChange={(e) => setBillingData({ ...billingData, postalCode: e.target.value })}
                className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Country</label>
            <CountrySelect
              value={billingData.country}
              onChange={(val) => setBillingData({ ...billingData, country: val })}
              required
            />
          </div>
        </div>

        <h2 className="font-serif text-xl text-charcoal mb-4 mt-8">Secure Payment</h2>
        <p className="mb-5 text-sm leading-6 text-charcoal-light">
          Your payment is processed securely. Your painting preview is sent
          before the artwork ships.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Card Information</label>
            <div className="w-full border border-border px-4 py-3 focus-within:border-terracotta bg-white">
              <CardElement
                options={{
                  hidePostalCode: true,
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#2c2c2c',
                      '::placeholder': { color: '#9ca3af' },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Cardholder Name</label>
            <input
              type="text"
              value={cardData.name}
              onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
              className="w-full border border-border px-4 py-3 focus:outline-none focus:border-terracotta"
              placeholder="Name on card"
              required
            />
          </div>
        </div>
      </div>
    </>
  );
}
