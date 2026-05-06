import { useState, useEffect, useRef } from "react";
import { Bot, MessageCircle, Send, X, User, Loader2 } from "lucide-react";
import { apiService, type ChatSession, type ChatMessage } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
}

const ChatAssistantEnhanced = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm CourtPilot AI powered by Ollama. Ask me about court judgments, directives, deadlines, or compliance requirements.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize chat session when drawer opens
  useEffect(() => {
    if (isOpen && !session && user) {
      initializeSession();
    }
  }, [isOpen, user]);

  const initializeSession = async () => {
    try {
      const userId = user?.id || "guest_user";
      const userName = user?.name || "Guest User";
      
      const newSession = await apiService.createChatSession(
        userId,
        userName,
        undefined,
        "general"
      );
      
      setSession(newSession);
      setError(null);
    } catch (err: any) {
      console.error("Failed to create chat session:", err);
      setError("Failed to connect to AI. Using offline mode.");
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      if (session) {
        // Send to backend AI
        const userId = user?.id || "guest_user";
        const response = await apiService.sendChatMessage(
          session.id,
          userId,
          userMessage.content
        );

        const botMessage: Message = {
          role: "assistant",
          content: response.content,
          timestamp: response.timestamp,
        };

        setMessages((prev) => [...prev, botMessage]);
      } else {
        // Fallback to local responses if no session
        const botMessage: Message = {
          role: "assistant",
          content: getFallbackResponse(userMessage.content),
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMessage]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      
      // Fallback to local response on error
      const botMessage: Message = {
        role: "assistant",
        content: "I'm having trouble connecting to the AI service. " + getFallbackResponse(input),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setError("Connection issue. Using offline responses.");
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes("deadline")) {
      return "The current compliance deadline is 11 June 2026. This is marked as High priority.";
    }

    if (q.includes("appeal")) {
      return "Appeal success probability is estimated at 32% based on similar case patterns. Compliance is recommended.";
    }

    if (q.includes("risk")) {
      return "This case is marked High Risk due to deadline proximity and mandatory compliance directive.";
    }

    if (q.includes("pending")) {
      return "There are 2 pending tasks: Collect Supporting Documents and Submit Final Report.";
    }

    if (q.includes("action")) {
      return "Recommended actions: prepare compliance report, collect supporting documents, and submit final report before deadline.";
    }

    if (q.includes("directive")) {
      return "I can help you understand court directives, their priorities, and required actions. Please provide more specific details about which directive you'd like to know about.";
    }

    return "I can help with court judgments, directives, deadlines, risk assessment, appeal recommendations, and compliance tracking. What would you like to know?";
  };

  const handleClose = async () => {
    if (session) {
      try {
        await apiService.closeChatSession(session.id);
      } catch (err) {
        console.error("Failed to close session:", err);
      }
    }
    setIsOpen(false);
    setSession(null);
  };

  return (
    <>
      <button
        className="chat-float"
        onClick={() => setIsOpen(true)}
        title="AI Assistant"
      >
        <MessageCircle size={24} />
      </button>

      {isOpen && (
        <div className="chat-overlay">
          <div className="chat-drawer">
            <div className="chat-drawer-header">
              <div>
                <h2>CourtPilot AI Assistant</h2>
                <p>
                  {session ? (
                    <>Powered by Ollama • gemma3:12b</>
                  ) : (
                    <>Connecting to AI...</>
                  )}
                </p>
              </div>

              <button onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="chat-error-banner">
                <span>⚠️ {error}</span>
              </div>
            )}

            <div className="chat-suggestions">
              <button onClick={() => setInput("What is the deadline?")}>
                Deadline
              </button>
              <button onClick={() => setInput("Should we appeal?")}>
                Appeal
              </button>
              <button onClick={() => setInput("What is the risk score?")}>
                Risk
              </button>
              <button onClick={() => setInput("What actions are pending?")}>
                Pending
              </button>
            </div>

            <div className="chat-messages">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user"
                      ? "drawer-message user"
                      : "drawer-message bot"
                  }
                >
                  <div className="message-icon">
                    {message.role === "user" ? (
                      <User size={15} />
                    ) : (
                      <Bot size={15} />
                    )}
                  </div>

                  <p>{message.content}</p>
                </div>
              ))}

              {isLoading && (
                <div className="drawer-message bot">
                  <div className="message-icon">
                    <Loader2 size={15} className="spinning" />
                  </div>
                  <p>Thinking...</p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-drawer-input">
              <input
                placeholder="Ask CourtPilot AI..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) handleSend();
                }}
                disabled={isLoading}
              />

              <button onClick={handleSend} disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
              </button>
            </div>

            {session && (
              <div className="chat-session-info">
                <span>Session ID: {session.id.substring(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .chat-error-banner {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          padding: 0.75rem;
          margin: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #92400e;
        }

        .chat-session-info {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default ChatAssistantEnhanced;
