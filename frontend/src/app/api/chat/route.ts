import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { GEMINI_SYSTEM_INSTRUCTION } from "@/lib/constants";

const OFFLINE_MESSAGE =
  "I'm sorry, the art concierge is offline right now. Please try again later or contact Cansoria support.";

interface ChatRequestBody {
  message?: unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: OFFLINE_MESSAGE }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
      },
    });

    return NextResponse.json({
      text: response.text || "I'm listening, but I could not quite catch that.",
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      {
        error:
          "I'm having trouble connecting right now. Please try again in a moment or contact Cansoria support.",
      },
      { status: 500 }
    );
  }
}
