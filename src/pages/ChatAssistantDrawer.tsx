import { useState } from "react";
import { Bot, MessageCircle, Send, X, User } from "lucide-react";

interface Message {
  role: "bot" | "user";
  text: string;
}

const ChatAssistantDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hello! I’m CourtPilot AI. Ask me about deadlines, appeal recommendation, risk score, or pending actions.",
    },
  ]);

  const getAIResponse = (query: string) => {
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

    return "I can help with deadlines, risk score, appeal recommendation, action plan, and pending task status.";
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: input,
    };

    const botMessage: Message = {
      role: "bot",
      text: getAIResponse(input),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
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
                <p>Ask about case, deadline, risk, or appeal</p>
              </div>

              <button onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

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

                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="chat-drawer-input">
              <input
                placeholder="Ask CourtPilot AI..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />

              <button onClick={handleSend}>
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