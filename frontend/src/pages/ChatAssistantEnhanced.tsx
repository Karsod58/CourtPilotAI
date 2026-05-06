import { useState, useEffect, useRef } from "react";
import { Bot, MessageCircle, Send, X, User, Loader2, FileText, Search } from "lucide-react";
import { apiService, type ChatSession, type ChatMessage, type Judgment } from "../services/apiService";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
  sources?: any[];
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
  const [selectedJudgment, setSelectedJudgment] = useState<Judgment | null>(null);
  const [showJudgmentSelector, setShowJudgmentSelector] = useState(false);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [judgmentSearchQuery, setJudgmentSearchQuery] = useState("");
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

  // Load judgments when selector is opened
  useEffect(() => {
    if (showJudgmentSelector && judgments.length === 0) {
      loadJudgments();
    }
  }, [showJudgmentSelector]);

  // Listen for external judgment selection (from Cases page)
  useEffect(() => {
    const handleOpenWithJudgment = (event: any) => {
      const judgment = event.detail;
      if (judgment) {
        setIsOpen(true);
        setTimeout(() => {
          handleJudgmentSelect(judgment);
        }, 100);
      }
    };

    window.addEventListener('openChatWithJudgment', handleOpenWithJudgment);
    return () => {
      window.removeEventListener('openChatWithJudgment', handleOpenWithJudgment);
    };
  }, [session]);

  const loadJudgments = async () => {
    try {
      const response = await apiService.getJudgments(1, 50);
      setJudgments(response.items);
    } catch (err) {
      console.error("Failed to load judgments:", err);
    }
  };

  const initializeSession = async (judgmentId?: string) => {
    try {
      const userId = user?.id || "guest_user";
      const userName = user?.name || "Guest User";
      
      const newSession = await apiService.createChatSession(
        userId,
        userName,
        judgmentId,
        judgmentId ? "judgment" : "general"
      );
      
      setSession(newSession);
      setError(null);

      // Update welcome message if judgment is selected
      if (judgmentId && selectedJudgment) {
        setMessages([{
          role: "assistant",
          content: `Hello! I'm CourtPilot AI. I'm now focused on Case ${selectedJudgment.case_id} (${selectedJudgment.court_name}). Ask me about this judgment's directives, deadlines, compliance requirements, or any other details.`,
        }]);
      }
    } catch (err: any) {
      console.error("Failed to create chat session:", err);
      setError("Failed to connect to AI. Using offline mode.");
    }
  };

  const handleJudgmentSelect = async (judgment: Judgment) => {
    setSelectedJudgment(judgment);
    setShowJudgmentSelector(false);
    
    // Close existing session and create new one with judgment context
    if (session) {
      try {
        await apiService.closeChatSession(session.id);
      } catch (err) {
        console.error("Failed to close session:", err);
      }
    }
    
    setSession(null);
    setMessages([]);
    await initializeSession(judgment.id);
  };

  const handleClearJudgment = async () => {
    setSelectedJudgment(null);
    
    // Close existing session and create new general one
    if (session) {
      try {
        await apiService.closeChatSession(session.id);
      } catch (err) {
        console.error("Failed to close session:", err);
      }
    }
    
    setSession(null);
    setMessages([{
      role: "assistant",
      content: "Hello! I'm CourtPilot AI powered by Ollama. Ask me about court judgments, directives, deadlines, or compliance requirements.",
    }]);
    await initializeSession();
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
          sources: response.sources,
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

            {/* Judgment Context Display */}
            {selectedJudgment && (
              <div className="chat-judgment-context">
                <div className="judgment-context-header">
                  <FileText size={16} />
                  <span>Discussing: Case {selectedJudgment.case_id}</span>
                  <button 
                    className="clear-judgment-btn"
                    onClick={handleClearJudgment}
                    title="Clear judgment context"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="judgment-context-details">
                  <span>{selectedJudgment.court_name}</span>
                  <span>•</span>
                  <span>{new Date(selectedJudgment.judgment_date).toLocaleDateString()}</span>
                </div>
              </div>
            )}

            {/* Judgment Selector Button */}
            {!selectedJudgment && (
              <div className="chat-judgment-selector-btn">
                <button onClick={() => setShowJudgmentSelector(true)}>
                  <FileText size={16} />
                  Select a judgment for context
                </button>
              </div>
            )}

            {/* Judgment Selector Modal */}
            {showJudgmentSelector && (
              <div className="judgment-selector-modal">
                <div className="judgment-selector-header">
                  <h3>Select Judgment</h3>
                  <button onClick={() => setShowJudgmentSelector(false)}>
                    <X size={18} />
                  </button>
                </div>
                
                <div className="judgment-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by case ID, court, or parties..."
                    value={judgmentSearchQuery}
                    onChange={(e) => setJudgmentSearchQuery(e.target.value)}
                  />
                </div>

                <div className="judgment-list">
                  {judgments
                    .filter(j => 
                      judgmentSearchQuery === "" ||
                      j.case_id.toLowerCase().includes(judgmentSearchQuery.toLowerCase()) ||
                      j.court_name.toLowerCase().includes(judgmentSearchQuery.toLowerCase()) ||
                      j.petitioner?.toLowerCase().includes(judgmentSearchQuery.toLowerCase()) ||
                      j.respondent?.toLowerCase().includes(judgmentSearchQuery.toLowerCase())
                    )
                    .map(judgment => (
                      <div
                        key={judgment.id}
                        className="judgment-item"
                        onClick={() => handleJudgmentSelect(judgment)}
                      >
                        <div className="judgment-item-header">
                          <strong>{judgment.case_id}</strong>
                          <span className="judgment-date">
                            {new Date(judgment.judgment_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="judgment-item-court">{judgment.court_name}</div>
                        {judgment.petitioner && judgment.respondent && (
                          <div className="judgment-item-parties">
                            {judgment.petitioner} vs {judgment.respondent}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
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

                  <div className="message-content">
                    <p>{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="message-sources">
                        <small>Sources: {message.sources.map(s => s.type).join(", ")}</small>
                      </div>
                    )}
                  </div>
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

        .chat-judgment-context {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          padding: 0.75rem 1rem;
          margin: 0.5rem 1rem;
          border-radius: 0.5rem;
        }

        .judgment-context-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 0.25rem;
        }

        .judgment-context-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #3b82f6;
          margin-left: 1.5rem;
        }

        .clear-judgment-btn {
          margin-left: auto;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          color: #1e40af;
          display: flex;
          align-items: center;
        }

        .clear-judgment-btn:hover {
          color: #1e3a8a;
        }

        .chat-judgment-selector-btn {
          padding: 0.5rem 1rem;
          margin: 0.5rem 1rem;
        }

        .chat-judgment-selector-btn button {
          width: 100%;
          padding: 0.75rem;
          background: #f3f4f6;
          border: 1px dashed #9ca3af;
          border-radius: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #4b5563;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .chat-judgment-selector-btn button:hover {
          background: #e5e7eb;
          border-color: #6b7280;
        }

        .judgment-selector-modal {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .judgment-selector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .judgment-selector-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .judgment-selector-header button {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
        }

        .judgment-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .judgment-search input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem;
          font-size: 0.875rem;
        }

        .judgment-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .judgment-item {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .judgment-item:hover {
          background: #f9fafb;
          border-color: #3b82f6;
        }

        .judgment-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .judgment-item-header strong {
          color: #1f2937;
          font-size: 0.875rem;
        }

        .judgment-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .judgment-item-court {
          font-size: 0.875rem;
          color: #4b5563;
          margin-bottom: 0.25rem;
        }

        .judgment-item-parties {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .message-content {
          flex: 1;
        }

        .message-sources {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .message-sources small {
          color: #6b7280;
          font-size: 0.75rem;
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
