"use client";

import { useNewsletter } from "@/hooks/useNewsletter";
import { Turnstile } from "@marsidev/react-turnstile";
import { Loader2 } from "lucide-react";

export default function NewsletterSection() {
    const {
        email,
        setEmail,
        isLoading,
        status,
        errorMessage,
        subscribe,
        turnstileRef,
        turnstileSiteKey,
        isSecurityConfigured,
        securityUnavailableMessage,
        setTurnstileToken,
        setErrorMessage,
    } = useNewsletter();

    return (
        <section className="bg-[#F5F3EF] py-24 border-t border-gray-200">
            <div className="max-w-xl mx-auto px-6 text-center">
                <h2 className="font-serif text-3xl lg:text-4xl text-charcoal mb-4">
                    Artful ideas in your inbox.
                </h2>
                <p className="text-charcoal-light font-light mb-8 leading-relaxed">
                    Join our community for home decor notes, custom painting ideas,
                    and <span className="font-medium text-terracotta">member offers</span>.
                </p>

                {status === "success" ? (
                    <div className="p-4 bg-green-50 text-green-800 text-sm rounded">
                        Thank you for subscribing! Check your inbox for studio updates.
                    </div>
                ) : (
                    <form onSubmit={subscribe} className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                                className="flex-1 bg-white border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-terracotta rounded-sm disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !isSecurityConfigured}
                                className="bg-charcoal text-white px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-terracotta transition-colors rounded-sm shadow-lg disabled:opacity-70 flex items-center justify-center min-w-[140px]"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Subscribe"}
                            </button>
                        </div>

                        {status === "error" && (
                            <p className="text-xs text-red-500 text-left">{errorMessage}</p>
                        )}

                        {isSecurityConfigured ? (
                            <div className="flex justify-center mt-4">
                                <div className="origin-center scale-90" style={{ height: "65px" }}>
                                    <Turnstile
                                        ref={turnstileRef}
                                        siteKey={turnstileSiteKey}
                                                onSuccess={(token) => setTurnstileToken(token)}
                                        onError={() => setErrorMessage("Security check failed. Please try again.")}
                                        onExpire={() => setTurnstileToken(null)}
                                        options={{
                                            action: 'newsletter',
                                            theme: "light",
                                            size: "normal",
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-amber-700">
                                {securityUnavailableMessage}
                            </p>
                        )}

                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                            Unsubscribe at any time.
                        </p>
                    </form>
                )}
            </div>
        </section>
    );
}
