import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { GEMINI_SYSTEM_INSTRUCTION } from "@/lib/constants";
import { admitChatRequest, chatClientKey, ChatControlError, CHAT_DEADLINE_MS, readChatBody } from "@/lib/chat-controls";

export const runtime = "nodejs";

const OFFLINE_MESSAGE =
  "I'm sorry, the art concierge is offline right now. Please try again later or contact Cansoria support.";

function errorResponse(status: number, retryAfter = 60) {
  return NextResponse.json({ error: status === 400 ? "Invalid chat request." : OFFLINE_MESSAGE }, {
    status,
    headers: { "Cache-Control": "no-store", ...([429, 503].includes(status) ? { "Retry-After": String(retryAfter) } : {}) },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return errorResponse(503);
  }
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), CHAT_DEADLINE_MS);
  const disconnect = () => controller.abort();
  request.signal.addEventListener("abort", disconnect, { once: true });
  if (request.signal.aborted) controller.abort();
  let release: (() => Promise<void>) | undefined;
  try {
    const body = await readChatBody(request, controller.signal);
    const rawMessage = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : "";
    const message = rawMessage.trim();
    if (rawMessage.length > 2000) return errorResponse(400);
    if (!message || message.length > 2000) return errorResponse(400);
    release = await admitChatRequest(chatClientKey(request));
    if (controller.signal.aborted) throw new ChatControlError(503);
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        maxOutputTokens: 256,
        abortSignal: controller.signal,
        httpOptions: { timeout: CHAT_DEADLINE_MS },
      },
    });
    if (controller.signal.aborted) throw new ChatControlError(503);

    return NextResponse.json({
      text: response.text || "I'm listening, but I could not quite catch that.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ChatControlError) return errorResponse(error.status, error.retryAfter);
    return errorResponse(503);
  } finally {
    clearTimeout(deadline);
    request.signal.removeEventListener("abort", disconnect);
    // Gemini cancellation is client-only. Keep an aborted request's lease until expiry.
    if (!controller.signal.aborted) await release?.();
  }
}
