"use client";

import { Loader2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useNewsletter } from "@/hooks/useNewsletter";

export default function Newsletter() {
    const {
        email,
        setEmail,
        isLoading,
        status,
        errorMessage,
        discountCode,
        subscribe,
        turnstileRef,
        turnstileSiteKey,
        isSecurityConfigured,
        securityUnavailableMessage,
        setTurnstileToken,
        setErrorMessage
    } = useNewsletter();

    const handleSubmit = subscribe;

    return (
        <div className="w-full">
            <h5 className="uppercase tracking-widest text-xs font-bold text-terracotta mb-6">
                Studio Notes and Member Offers
            </h5>
            <p className="text-sm text-charcoal-light mb-4">
                Join Cansoria for art styling notes, custom painting ideas, and private offers. Unsubscribe anytime.
            </p>

            {status === "success" ? (
                <div className="p-4 bg-green-50 text-green-800 text-sm rounded">
                    <p className="font-medium">Thank you for subscribing!</p>
                    {discountCode && (
                        <p className="mt-2">
                            Your 15% off code: <span className="font-mono font-semibold">{discountCode}</span>
                        </p>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent border-b border-gray-300 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-terracotta transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !isSecurityConfigured}
                        className="w-full bg-charcoal text-white py-2 text-xs uppercase tracking-widest hover:bg-terracotta transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            "Get My Code"
                        )}
                    </button>

                    {status === "error" && (
                        <p className="text-xs text-red-500">{errorMessage}</p>
                    )}

                    {isSecurityConfigured ? (
                        <div className="mt-2 origin-top-left scale-85" style={{ height: "55px" }}> {/* Scale down to compress height */}
                            <Turnstile
                                ref={turnstileRef}
                                siteKey={turnstileSiteKey}
                                onSuccess={(token) => setTurnstileToken(token)}
                                onError={() => setErrorMessage("Security check failed. Please try again.")}
                                onExpire={() => setTurnstileToken(null)}
                                options={{
                                    action: 'newsletter',
                                    theme: "light",
                                    size: "normal" // Switch to normal (horizontal) which is shorter (65px) than compact (120px)
                                }}
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-amber-700">
                            {securityUnavailableMessage}
                        </p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1">
                        No spam. Just thoughtful art notes and offers.
                    </p>
                </form>
            )}
        </div>
    );
}
