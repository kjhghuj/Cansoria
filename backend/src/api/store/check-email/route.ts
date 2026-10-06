import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type CheckEmailRequestBody = {
    email: string;
};

export async function POST(
    req: MedusaRequest<CheckEmailRequestBody>,
    res: MedusaResponse
) {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({
            type: "invalid_request",
            message: "Email is required",
        });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.json({ message: "Continue with sign in or create an account." });
}
