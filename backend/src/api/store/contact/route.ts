import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Resend } from "resend";
import { verifyTurnstileToken } from "../../../lib/turnstile";
import { sensitiveResponse } from "../../../lib/resource-access";

export async function POST(
  req: MedusaRequest<Record<string, unknown>>,
  res: MedusaResponse,
) {
  sensitiveResponse(res);
  const { name, email, topic, message, turnstile_token, website } =
    req.body || {};
  if (
    website ||
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 100 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 5000 ||
    typeof topic !== "string" ||
    !["photo", "commission", "order", "feedback"].includes(topic)
  )
    return res
      .status(400)
      .json({ message: "Please check your contact details and message." });
  if (
    typeof turnstile_token !== "string" ||
    !(await verifyTurnstileToken(turnstile_token, "contact"))
  )
    return res
      .status(400)
      .json({ message: "Please complete the security check." });
  if (
    !process.env.CONTACT_EMAIL ||
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL
  )
    return res
      .status(503)
      .json({
        message: "The contact form is unavailable. Please email the studio.",
      });
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: process.env.CONTACT_EMAIL,
      replyTo: email,
      subject: `Cansoria studio inquiry: ${topic}`,
      text: `Name: ${name.trim()}\nEmail: ${email}\nTopic: ${topic}\n\n${message.trim()}`,
    });
    if (error) throw new Error("Delivery failed");
    return res.json({ message: "Your message has been sent to the studio." });
  } catch {
    return res
      .status(503)
      .json({
        message: "Unable to send your message. Please email the studio.",
      });
  }
}
