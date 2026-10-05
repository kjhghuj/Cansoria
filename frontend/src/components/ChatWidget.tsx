"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { Message } from "@/lib/types";
import { sendMessageToGemini } from "@/lib/gemini";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "model",
      text: "Hello, I'm your Cansoria art concierge. I can help you choose a painting style, canvas size, or custom gift idea.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: trimmedInput,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const responseText = await sendMessageToGemini(trimmedInput);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "model",
      text: responseText,
    };
    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 w-80 sm:w-96 bg-white shadow-2xl rounded-sm border border-gray-100 overflow-hidden flex flex-col animate-fade-in"
          style={{ height: "500px" }}
        >
          {/* Header */}
          <div className="bg-sage/10 p-4 border-b border-sage/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sage" />
              <h3 className="font-serif text-charcoal font-medium">
                Cansoria Art Concierge
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-charcoal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-cream/50 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 text-sm rounded-lg ${
                    msg.role === "user"
                      ? "bg-terracotta text-white rounded-br-none"
                      : "bg-white border border-gray-200 text-charcoal rounded-bl-none shadow-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about sizes, pets, gifts..."
                className="flex-1 text-sm p-2 border border-gray-200 focus:outline-none focus:border-terracotta rounded-sm bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-2 text-terracotta hover:bg-terracotta/10 rounded-full transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-terracotta text-white rounded-full shadow-lg flex items-center justify-center hover:bg-terracotta-dark transition-all duration-300 transform hover:scale-105"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
