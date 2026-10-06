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
const SECURITY_UNAVAILABLE_MESSAGE = "Security check unavailable in this environment.";

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "";
}

export function useNewsletter() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<Status>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [discountCode, setDiscountCode] = useState<string | null>(null);
    const [validUntil, setValidUntil] = useState<string | null>(null);
    const turnstileRef = useRef<TurnstileInstance>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const subscribe = async (e: React.FormEvent) => {
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
                        email,
                        turnstile_token: turnstileToken,
                    }),
                }
            );

            const data = (await response.json()) as NewsletterResponse;

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setStatus("success");
            setDiscountCode(data.discount_code || null);
            setValidUntil(data.valid_until || null);
            setEmail("");
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        } catch (error: unknown) {
            console.error("Newsletter subscription error:", error);
            setStatus("error");
            setErrorMessage(getErrorMessage(error) || "Failed to subscribe");
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        } finally {
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
