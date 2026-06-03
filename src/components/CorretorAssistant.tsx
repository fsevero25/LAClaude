import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, Loader } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CorretorAssistantProps {
  open: boolean;
  onClose: () => void;
}

export function CorretorAssistant({ open, onClose }: CorretorAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o assistente do LACrm. Posso ajudar com estratégias de atendimento, scripts de vendas, dicas para fechar negócios e muito mais. O que você precisa?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiKey = import.meta.env.VITE_LOVABLE_API_KEY ?? "";

      const response = await fetch("https://api.lovable.app/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente especializado em vendas imobiliárias e CRM. Ajude corretores de imóveis com estratégias de atendimento, negociação, follow-up de leads e fechamento de negócios. Seja objetivo e prático. Responda em português do Brasil.",
            },
            ...messages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as {
        choices: { message: { content: string } }[];
      };
      const assistantContent =
        data.choices?.[0]?.message?.content ?? "Desculpe, não consegui gerar uma resposta.";

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Erro ao conectar com o assistente: ${String(e)}. Verifique sua LOVABLE_API_KEY.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
      />
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: 440,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Bot size={18} color="var(--accent)" />
            <div>
              <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Assistente IA</h2>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)" }}>Gemini 2.5 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: "0.5rem",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: msg.role === "user" ? "var(--foreground)" : "var(--surface-raised)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {msg.role === "user" ? (
                  <User size={14} color="var(--background)" />
                ) : (
                  <Bot size={14} color="var(--accent)" />
                )}
              </div>
              <div
                style={{
                  maxWidth: "80%",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "10px",
                  background:
                    msg.role === "user"
                      ? "var(--foreground)"
                      : "var(--surface-raised)",
                  color: msg.role === "user" ? "var(--background)" : "var(--foreground)",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--surface-raised)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader size={14} color="var(--accent)" />
              </div>
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "10px",
                  background: "var(--surface-raised)",
                  color: "var(--muted)",
                  fontSize: "0.875rem",
                }}
              >
                Pensando...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Pergunte algo..."
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--foreground)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: "0.5rem 0.85rem",
              background: input.trim() ? "var(--foreground)" : "var(--border)",
              color: input.trim() ? "var(--background)" : "var(--muted)",
              border: "none",
              borderRadius: "8px",
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  );
}
