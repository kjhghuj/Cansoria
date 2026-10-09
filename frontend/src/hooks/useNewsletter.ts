import { useState, useRef } from "react";
import { type TurnstileInstance } from "@marsidev/react-turnstile";

type Status = "idle" | "success" | "error";
type NewsletterResponse = {
    message?: string;
    discount_code?: string;
    valid_until?: string;
};

const MEDUSA_BACKEND_URL = "/api/medusa";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SECURITY_UNAVAILABLE_MESSAGE = "Email signup is temporarily unavailable. Please try again later.";

function getResponseError(status: number) {
    switch (status) {
        case 400:
            return "Please check your email address and complete the security check again.";
        case 403:
            return "Please use your account email, or sign out to subscribe with another email address.";
        case 429:
            return "Too many signup attempts. Please wait a moment and try again.";
        case 503:
            return SECURITY_UNAVAILABLE_MESSAGE;
        default:
            return "We couldn't process your signup. Please try again.";
    }
}

export function useNewsletter() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<Status>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const [validUntil, setValidUntil] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);
    const submittingRef = useRef(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const subscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRef.current) return;

        const normalizedEmail = email.trim();
        if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            setStatus("error");
            setErrorMessage("Please enter a valid email address.");
            return;
        }

        if (!TURNSTILE_SITE_KEY) {
            setStatus("error");
            setErrorMessage(SECURITY_UNAVAILABLE_MESSAGE);
            return;
        }

        if (!turnstileToken) {
            setStatus("error");
            setErrorMessage("Please complete the security check.");
            return;
        }

        submittingRef.current = true;
        setIsLoading(true);
        setStatus("idle");
        setErrorMessage("");
        setDiscountCode(null);
        setValidUntil(null);

        try {
            const response = await fetch(
                `${MEDUSA_BACKEND_URL}/store/newsletter`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-publishable-api-key":
                            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
                    },
                    body: JSON.stringify({
                        email: normalizedEmail,
                        turnstile_token: turnstileToken,
                    }),
                }
            );

            if (!response.ok) {
                setStatus("error");
                setErrorMessage(getResponseError(response.status));
                return;
            }

            const data = (await response.json()) as NewsletterResponse;
            setStatus("success");
            setDiscountCode(data.discount_code || null);
            setValidUntil(data.valid_until || null);
            setEmail("");
        } catch {
            setStatus("error");
            setErrorMessage("Unable to connect. Please check your connection and try again.");
        } finally {
            turnstileRef.current?.reset();
            setTurnstileToken(null);
            submittingRef.current = false;
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStatus("idle");
        setEmail("");
        setErrorMessage("");
        setDiscountCode(null);
        setValidUntil(null);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
    }

    return {
        email,
        setEmail,
        isLoading,
        status,
        errorMessage,
        discountCode,
        validUntil,
        subscribe,
        turnstileRef,
        turnstileSiteKey: TURNSTILE_SITE_KEY,
        isSecurityConfigured: Boolean(TURNSTILE_SITE_KEY),
        securityUnavailableMessage: SECURITY_UNAVAILABLE_MESSAGE,
        setTurnstileToken,
        setErrorMessage,
        reset
    };
}
