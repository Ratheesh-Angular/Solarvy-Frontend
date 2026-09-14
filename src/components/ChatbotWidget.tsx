import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ApiError, sendChatMessage } from "../lib/api";
import "../css/chatbot.css";

const CHAT_SESSION_KEY = "solarvy_chat_session_id";
const MAX_INPUT_LENGTH = 1000;

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  isError?: boolean;
};

const SUGGESTIONS = [
  "How does Solarvy work?",
  "What does the assessment cover?",
  "Who is Solarvy for?",
];

function loadSessionId(): string | null {
  try {
    return localStorage.getItem(CHAT_SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSessionId(id: string) {
  try {
    localStorage.setItem(CHAT_SESSION_KEY, id);
  } catch {
    /* ignore */
  }
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 19.5 4 21l1.2-3.6A8.5 8.5 0 1 1 12 20.5a8.4 8.4 0 0 1-4.5-1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h12M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ChatbotWidget() {
  const location = useLocation();
  const panelId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(() => loadSessionId());
  const [isSending, setIsSending] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isSending, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || isSending) return;

      if (text.length > MAX_INPUT_LENGTH) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `Please keep your message under ${MAX_INPUT_LENGTH} characters.`,
            isError: true,
          },
        ]);
        return;
      }

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsSending(true);

      try {
        const result = await sendChatMessage({
          sessionId: sessionId ?? undefined,
          message: text,
        });

        if (result.sessionId && result.sessionId !== sessionId) {
          setSessionId(result.sessionId);
          saveSessionId(result.sessionId);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: result.reply,
          },
        ]);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Sorry — I couldn't reach Solarvy support right now. Please try again in a moment.";

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: message,
            isError: true,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, sessionId],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  if (isAdminRoute) return null;

  const showWelcome = messages.length === 0 && !isSending;

  return (
    <div className="sv-chatbot">
      <div
        ref={panelRef}
        id={panelId}
        className={`sv-chatbot-panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <header className="sv-chatbot-header">
          <div className="sv-chatbot-avatar">
            <SunMark />
          </div>
          <div className="sv-chatbot-header-text">
            <h2 id={titleId} className="sv-chatbot-title">
              Solarvy Assistant
            </h2>
            <p className="sv-chatbot-subtitle">Ask about solar, assessments &amp; next steps</p>
          </div>
          <button
            type="button"
            className="sv-chatbot-header-close"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          >
            <CloseIcon className="sv-chatbot-fab-icon" />
          </button>
        </header>

        <div className="sv-chatbot-messages" ref={listRef} aria-live="polite">
          {showWelcome && (
            <div className="sv-chatbot-welcome">
              <strong>Hi — how can Solarvy help?</strong>
              <p>
                I can explain how Solarvy works, what the assessment covers, and
                how to compare installer options. Ask anything solar-related.
              </p>
              <div className="sv-chatbot-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="sv-chatbot-suggestion"
                    disabled={isSending}
                    onClick={() => void sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`sv-chatbot-bubble-row is-${message.role}`}
            >
              <div
                className={`sv-chatbot-bubble${message.isError ? " is-error" : ""}`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="sv-chatbot-bubble-row is-assistant" aria-label="Assistant is typing">
              <div className="sv-chatbot-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <form className="sv-chatbot-composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="sv-chatbot-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
            onKeyDown={handleInputKeyDown}
            placeholder="Type your question…"
            disabled={isSending}
            aria-label="Chat message"
            maxLength={MAX_INPUT_LENGTH}
          />
          <button
            type="submit"
            className="sv-chatbot-send"
            disabled={isSending || !input.trim()}
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
        <p className="sv-chatbot-footnote">
          Guidance only — not a substitute for a full site survey.
        </p>
      </div>

      {/* <button
        type="button"
        className={`sv-chatbot-fab${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close Solarvy chat" : "Open Solarvy chat"}
        onClick={() => setOpen((value) => !value)}
      >
        <ChatIcon className="sv-chatbot-fab-icon sv-chatbot-fab-open" />
        <CloseIcon className="sv-chatbot-fab-icon sv-chatbot-fab-close" />
      </button> */}
    </div>
  );
}
