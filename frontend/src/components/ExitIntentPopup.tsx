"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "";
}

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SECURITY_UNAVAILABLE_MESSAGE = "Security check unavailable in this environment.";

export default function ExitIntentPopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const turnstileRef = useRef<TurnstileInstance>(null);
    const hasShownRef = useRef(false);

    useEffect(() => {
        // Check local storage on mount
        const hasSeenPopup = localStorage.getItem("cansoria_exit_popup_seen");
        if (hasSeenPopup) {
            hasShownRef.current = true;
            return;
        }

        // Timer trigger (10 seconds)
        const timer = setTimeout(() => {
            triggerPopup();
        }, 10000);

        // Mouse exit trigger
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) {
                triggerPopup();
            }
        };

        document.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    const triggerPopup = () => {
        if (hasShownRef.current) return;
        setIsVisible(true);
        hasShownRef.current = true;
        localStorage.setItem("cansoria_exit_popup_seen", "true");
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        if (!TURNSTILE_SITE_KEY) {
            setStatus("error");
            setErrorMessage(SECURITY_UNAVAILABLE_MESSAGE);
            return;
        }

        if (!turnstileToken) {
            setErrorMessage("Please complete the security check.");
            return;
        }

        setIsLoading(true);
        setStatus("idle");
        setErrorMessage("");
        setDiscountCode(null);

        try {
            const response = await fetch(`${MEDUSA_BACKEND_URL}/store/newsletter`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
                },
                body: JSON.stringify({
                    email,
                    turnstile_token: turnstileToken,
                }),
            });

            const data = (await response.json()) as { message?: string; discount_code?: string };

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setStatus("success");
            setDiscountCode(data.discount_code || null);
            // Optional: Don't close immediately so they see the success message
            setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        } catch (error: unknown) {
            console.error("Popup subscription error:", error);
            setStatus("error");
            setErrorMessage(getErrorMessage(error) || "Failed to subscribe");
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative w-full max-w-md bg-white p-8 md:p-12 shadow-2xl animate-in fade-in zoom-in duration-300">

                {/* Close Button (Top Right) */}
                <button
                    onClick={handleClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-charcoal transition-colors"
                >
                    <X size={20} />
                </button>

                {status === "success" ? (
                    <div className="text-center py-8">
                        <h3 className="font-serif text-2xl text-charcoal mb-4">You are on the list.</h3>
                        {discountCode ? (
                            <p className="text-charcoal-light">
                                Your 15% off code is <span className="font-mono font-semibold text-charcoal">{discountCode}</span>.
                            </p>
                        ) : (
                            <p className="text-charcoal-light">Check your inbox for your 15% off code.</p>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <h2 className="font-serif text-3xl text-charcoal mb-3">Wait, don&apos;t leave empty-handed.</h2>
                        <p className="text-charcoal-light mb-8 text-sm leading-relaxed">
                            Take <span className="font-semibold text-terracotta">15% OFF</span> your first custom painting or canvas artwork.
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-200 px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all text-center placeholder:text-center"
                                required
                            />

                            {errorMessage && (
                                <p className="text-xs text-red-500">{errorMessage}</p>
                            )}

                            {TURNSTILE_SITE_KEY ? (
                                <div className="flex justify-center" style={{ minHeight: "65px" }}>
                                    <Turnstile
                                        ref={turnstileRef}
                                        siteKey={TURNSTILE_SITE_KEY}
                                        onSuccess={(token) => setTurnstileToken(token)}
                                        onError={() => setErrorMessage("Security check failed.")}
                                        onExpire={() => setTurnstileToken(null)}
                                        options={{
                                            theme: "light",
                                            size: "normal",
                                        }}
                                    />
                                </div>
                            ) : (
                                <p className="text-xs text-amber-700">
                                    {SECURITY_UNAVAILABLE_MESSAGE}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !TURNSTILE_SITE_KEY}
                                className="w-full bg-charcoal text-white py-3 text-sm font-semibold tracking-wide hover:bg-terracotta transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isLoading && <Loader2 size={16} className="animate-spin" />}
                                UNLOCK 15% OFF
                            </button>
                        </form>

                        <button
                            onClick={handleClose}
                            className="mt-4 text-[10px] uppercase tracking-widest text-gray-400 hover:text-charcoal transition-colors border-b border-transparent hover:border-charcoal pb-0.5"
                        >
                            No thanks, I&apos;ll keep browsing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
