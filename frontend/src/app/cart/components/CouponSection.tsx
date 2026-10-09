import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/medusa";
import {
  CouponIcon,
  TrashIcon,
  getDiscountForCode,
  LoadingSpinner,
  CartDiscountData,
} from "./utils";

const CART_EXPIRED_MESSAGE =
  "Your cart session expired. Please add your artwork again.";

export default function CouponSection({
  cart,
  appliedCodes,
  currencyCode,
  onApplyCode,
  onRemoveCode,
  isLoading
}: {
  cart: CartDiscountData;
  appliedCodes: string[];
  currencyCode: string;
  onApplyCode: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemoveCode: (code: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [applying, setApplying] = useState(false);

  // Auto-expand if there's a message (e.g. from auto-apply) or codes are applied
  useEffect(() => {
    if (appliedCodes.length > 0 || message) {
      setIsOpen(true);
    }
  }, [appliedCodes.length, message]);

  // Helper to parse error messages
  const getUserFriendlyError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("cart not found") || m.includes("invalid cart")) {
      return CART_EXPIRED_MESSAGE;
    }
    if (m.includes("expired")) return "This code has expired.";
    if (m.includes("exist")) return "Code does not exist.";
    if (m.includes("invalid")) return "Invalid promo code.";
    if (m.includes("min_limit") || m.includes("threshold")) return "Cart total is too low for this code.";
    return msg;
  };

  const handleApply = async () => {
    if (!inputCode.trim()) return;
    setMessage(null);
    setApplying(true);
    try {
      const result = await onApplyCode(inputCode.trim().toUpperCase());
      if (result.success) {
        setInputCode("");
        // Optimistic success message, the UI will update with savings automatically in the list below
        setMessage({ text: "Code applied successfully!", type: 'success' });
      } else {
        const friendlyMsg = getUserFriendlyError(result.message);
        setMessage({ text: friendlyMsg, type: 'error' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const friendlyMsg = getUserFriendlyError(message);
      setMessage({ text: friendlyMsg, type: 'error' });
    } finally {
      setApplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleApply();
    }
  };

  return (
    <div className="border border-border overflow-hidden mb-4 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-cream transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-charcoal font-medium">
          <CouponIcon />
          <span>Have a collector code?</span>
        </div>
        <span className={`text-charcoal-light transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="p-4 bg-cream border-t border-border">
          {/* Applied Codes List */}
          {appliedCodes.length > 0 && (
            <div className="space-y-2 mb-4">
              {appliedCodes.map((code) => {
                const discountAmount = getDiscountForCode(cart, code);
                return (
                  <div key={code} className="flex items-center justify-between bg-white px-3 py-2 border border-green-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="font-mono font-medium text-charcoal">{code}</span>
                      {discountAmount > 0 && (
                        <span className="text-sm text-green-600 font-medium ml-1">
                          saved {formatPrice(discountAmount, currencyCode)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveCode(code)}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove code"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())} // Auto-uppercase
              onKeyDown={handleKeyDown}
              placeholder="Enter code"
              aria-label="Collector code"
              className="min-w-0 flex-1 px-4 py-2 bg-white border border-border text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal font-mono uppercase placeholder:normal-case"
              disabled={applying || isLoading}
            />
            <button
              onClick={handleApply}
              disabled={!inputCode.trim() || applying || isLoading}
              className="px-6 py-2 bg-charcoal text-white text-sm font-medium hover:bg-oil-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? <LoadingSpinner /> : "Apply"}
            </button>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div className={`mt-3 text-sm p-3 rounded-lg flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' :
              message.type === 'error' ? 'bg-red-50 text-red-600' :
                'bg-blue-50 text-blue-600'
              }`}>
              {message.type === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              )}
              {message.type === 'error' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
