import { useState, useEffect, useRef } from "react";
import { Bot, MessageCircle, Send, X, User } from "lucide-react";
import { apiService } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  role: "bot" | "user";
  text: string;
  timestamp?: string;
}

const ChatAssistantDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Initialize chat session when opened
  useEffect(() => {
    if (isOpen && !sessionId && user) {
      initializeSession();
    }
  }, [isOpen, sessionId, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeSession = async () => {
    try {
      const session = await apiService.createChatSession(
        user?.email || "guest",
        user?.name || "Guest User",
        undefined,
        "general"
      );
      setSessionId(session.id);
      
      // Add welcome message
      setMessages([{
        role: "bot",
        text: "Hello! I'm CourtPilot AI. I can help you with information about judgments, directives, deadlines, and compliance. What would you like to know?",
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error initializing chat session:', error);
      setMessages([{
        role: "bot",
        text: "Sorry, I'm having trouble connecting. Please try again later.",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(
        sessionId,
        user?.email || "guest",
        input
      );

      const botMessage: Message = {
        role: "bot",
        text: response.content,
        timestamp: response.timestamp
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: "bot",
        text: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (sessionId) {
      try {
        await apiService.closeChatSession(sessionId);
      } catch (error) {
        console.error('Error closing session:', error);
      }
    }
    setIsOpen(false);
    setSessionId(null);
    setMessages([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
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
                <p>Ask about judgments, directives, or compliance</p>
              </div>

              <button onClick={handleClose}>
                <X size={18} />
              </button>
            </div>

            {messages.length <= 1 && (
              <div className="chat-suggestions">
                <button onClick={() => handleSuggestionClick("Show me pending directives")}>
                  Pending Directives
                </button>
                <button onClick={() => handleSuggestionClick("What cases need verification?")}>
                  Verification
                </button>
                <button onClick={() => handleSuggestionClick("Show compliance status")}>
                  Compliance
                </button>
                <button onClick={() => handleSuggestionClick("What are the recent judgments?")}>
                  Recent Cases
                </button>
              </div>
            )}

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

                  <p>{message.text}</p>
                </div>
              ))}
              {isLoading && (
                <div className="drawer-message bot">
                  <div className="message-icon">
                    <Bot size={15} />
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
                disabled={isLoading || !sessionId}
              />

              <button onClick={handleSend} disabled={isLoading || !sessionId || !input.trim()}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistantDrawer;
