import axios from "axios";

export const verifyTurnstileToken = async (token: string, expectedAction?: string): Promise<boolean> => {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
        console.error("TURNSTILE_SECRET_KEY is not set");
        return false;
    }
    if (typeof token !== "string" || !token || token.length > 2048) return false;

    try {
        const formData = new URLSearchParams();
        formData.append("secret", secretKey);
        formData.append("response", token);

        const response = await axios.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            formData,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout: 10000, // 10 seconds timeout
            }
        );

        const data = response.data;

        if (!data.success) {
            console.warn("Turnstile verification failed:", data["error-codes"]);
            return false;
        }
        const allowedHostnames = (process.env.TURNSTILE_HOSTNAMES || "").split(",").map(host => host.trim().toLowerCase()).filter(Boolean);
        const action = expectedAction || process.env.TURNSTILE_ACTION || "newsletter";
        if (process.env.NODE_ENV === "production" && !allowedHostnames.length) return false;
        if (allowedHostnames.length && (typeof data.hostname !== "string" || !allowedHostnames.includes(data.hostname.toLowerCase()))) return false;
        if (data.action !== action) return false;

        return true;
    } catch (error) {
        console.warn("Turnstile verification unavailable");
        return false;
    }
};
