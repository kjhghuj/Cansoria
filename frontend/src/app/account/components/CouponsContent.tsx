import { useState } from "react";
import { Ticket, Loader2, Copy, Check } from "lucide-react";

const BACKEND_URL = "/api/medusa";
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";


interface AccountUser {
  metadata?: Record<string, unknown> | null;
}

export function CouponsContent({ user }: { user: AccountUser | null }) {
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const collectedCoupons = Array.isArray(user?.metadata?.coupons)
    ? user.metadata.coupons.filter((coupon): coupon is string => typeof coupon === "string")
    : [];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
  };

  const handleRedeem = async () => {
    if (!couponCode.trim()) return;
    setRedeeming(true);
    setRedeemMessage(null);

    const newCode = couponCode.trim().toUpperCase();

    if (collectedCoupons.includes(newCode)) {
      setRedeemMessage({ text: "You have already collected this coupon.", type: 'error' });
      setRedeeming(false);
      return;
    }

    try {
      const newCoupons = [...collectedCoupons, newCode];

      // Update customer metadata
      const response = await fetch(`${BACKEND_URL}/store/customers/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": API_KEY,
        },
        body: JSON.stringify({
          metadata: {
            ...user?.metadata,
            coupons: newCoupons
          }
        })
      });

      if (response.ok) {
        setRedeemMessage({ text: "Coupon redeemed! (Refresh if not visible)", type: 'success' });
        setCouponCode("");
      } else {
        throw new Error("Failed to redeem coupon");
      }
    } catch {
      setRedeemMessage({ text: "Failed to redeem. Please try again.", type: 'error' });
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-100">
      <h2 className="font-serif text-xl md:text-2xl text-charcoal mb-6">My Coupons</h2>

      {/* Redeem Section */}
      <div className="mb-8 md:mb-10 bg-gray-50 p-5 md:p-6 rounded-xl border border-gray-200">
        <h3 className="font-medium text-charcoal mb-4 text-sm md:text-base">Redeem New Coupon</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="flex-1 border border-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:border-terracotta uppercase font-mono text-sm"
          />
          <button
            onClick={handleRedeem}
            disabled={!couponCode.trim() || redeeming}
            className="w-full sm:w-auto bg-terracotta text-white px-6 py-3 rounded-lg uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
          </button>
        </div>
        {redeemMessage && (
          <p className={`text-sm mt-3 ${redeemMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {redeemMessage.text}
          </p>
        )}
      </div>

      {/* Coupons List */}
      <div>
        <h3 className="font-medium text-charcoal mb-4 text-sm md:text-base">Your Wallet</h3>
        {collectedCoupons.length === 0 ? (
          <div className="text-center py-10 text-charcoal-light bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <Ticket size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">You haven&apos;t collected any coupons yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collectedCoupons.map((code) => (
              <div key={code} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden flex shadow-sm transition-all hover:shadow-md">
                {/* Left Ticket Part */}
                <div className="flex-1 p-4 flex flex-col justify-center border-r border-dashed border-gray-200 relative">
                  {/* Visual Notches using CSS pseudo-elements could go here, but simple border-dashed is robust */}
                  <div className="absolute right-[-6px] top-0 bottom-0 flex flex-col justify-between py-1">
                    <div className="w-3 h-3 bg-white rounded-full border border-gray-200 -mt-[7px] translate-x-[0.5px]"></div>
                    <div className="w-3 h-3 bg-white rounded-full border border-gray-200 -mb-[7px] translate-x-[0.5px]"></div>
                  </div>

                  <span className="text-[10px] text-charcoal-light uppercase tracking-wider mb-1">Coupon Code</span>
                  <span className="font-mono text-lg md:text-xl font-bold text-terracotta break-all">{code}</span>
                </div>

                {/* Right Action Part */}
                <div className="bg-gray-50 p-0 w-14 flex items-center justify-center border-l-0">
                  <button
                    onClick={() => handleCopy(code)}
                    className="w-full h-full flex items-center justify-center text-charcoal-light hover:text-charcoal hover:bg-gray-100 transition-colors"
                    title="Copy Code"
                  >
                    {copiedCode === code ? (
                      <Check size={18} className="text-green-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
