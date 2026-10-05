interface ChatApiResponse {
  text?: string;
  error?: string;
}

const OFFLINE_MESSAGE =
  "I'm sorry, the art concierge is offline right now. Please try again later or contact Cansoria support.";

export const initChat = () => null;

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = (await response.json()) as ChatApiResponse;

    if (!response.ok) {
      return data.error || OFFLINE_MESSAGE;
    }

    return data.text || "I'm listening, but I could not quite catch that.";
  } catch (error) {
    console.error("Art concierge request failed:", error);
    return "I'm having trouble connecting right now. Please try again in a moment or contact Cansoria support.";
  }
};

const geminiClient = { initChat, sendMessageToGemini };

export default geminiClient;
