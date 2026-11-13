import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, sendChatMessage, type ChatMode } from "../lib/api";
import {
  completeAssessmentDraft,
  getAssessmentDraft,
} from "../lib/assessmentApi";
import { useOptionalAssessmentDraftBridge } from "../contexts/AssessmentDraftBridge";
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

const FAQ_SUGGESTIONS = [
  "How does Solarvy work?",
  "What does the assessment cover?",
  "Who is Solarvy for?",
];

const MISSING_LABELS: Record<string, string> = {
  propertyType: "Property type",
  template: "Template",
  powerSetup: "Power setup",
  gridUnavailableBand: "Grid unavailability",
  mainObjective: "Main objective",
  country: "Country",
  city: "State / city",
  backupDuration: "Backup duration",
  inputMethod: "Input method",
  monthlyElectricityBill: "Monthly bill",
  "appliance.rows": "Appliances",
  "custom.rows": "Custom equipment",
};

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
  const navigate = useNavigate();
  const draftBridge = useOptionalAssessmentDraftBridge();
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
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [draftId, setDraftId] = useState<number | null>(
    () => draftBridge?.draftId ?? null,
  );
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(
    null,
  );

  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (draftBridge?.draftId != null) {
      setDraftId(draftBridge.draftId);
    }
  }, [draftBridge?.draftId]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isSending, open, suggestedReplies, readyToComplete]);

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

  const selectMode = useCallback((next: ChatMode) => {
    setMode(next);
    setSuggestedReplies([]);
    setMissingFields([]);
    setReadyToComplete(false);
    setLastFailedMessage(null);
    if (next === "faq") {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "assistant",
          content:
            "Ask me anything about Solarvy, solar energy, or next steps. Your assessment draft is still saved if you need it.",
        },
      ]);
    }
  }, []);

  const sendMessage = useCallback(
    async (rawText: string, activeMode: ChatMode = mode || "faq") => {
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

      if (!mode) setMode(activeMode);

      const userMessage: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsSending(true);
      setLastFailedMessage(null);

      try {
        const result = await sendChatMessage({
          sessionId: sessionId ?? undefined,
          message: text,
          mode: activeMode,
          draftId: draftId ?? draftBridge?.draftId ?? undefined,
        });

        if (result.sessionId && result.sessionId !== sessionId) {
          setSessionId(result.sessionId);
          saveSessionId(result.sessionId);
        }

        if (result.mode === "assessment") {
          if (result.draftId != null) {
            setDraftId(result.draftId);
            draftBridge?.setDraft(
              result.draftId,
              result.formData ?? null,
              "chat",
            );
          }
          setMissingFields(result.missingFields ?? []);
          setSuggestedReplies(result.suggestedReplies ?? []);
          setReadyToComplete(Boolean(result.readyToComplete));
        } else {
          setSuggestedReplies([]);
          setReadyToComplete(false);
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

        setLastFailedMessage(text);
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
    [isSending, sessionId, mode, draftId, draftBridge],
  );

  const startAssessmentMode = useCallback(() => {
    setMode("assessment");
    setSuggestedReplies([]);
    setMissingFields([]);
    setReadyToComplete(false);
    setLastFailedMessage(null);
    void sendMessage(
      "I'd like help completing my solar assessment.",
      "assessment",
    );
  }, [sendMessage]);

  const handleComplete = useCallback(async () => {
    const id = draftId ?? draftBridge?.draftId;
    if (!id || isCompleting) return;
    setIsCompleting(true);
    try {
      const draft = await getAssessmentDraft(id);
      const result = await completeAssessmentDraft(id, draft.formData);
      setReadyToComplete(false);
      setOpen(false);
      navigate(`/assessment-result?assessment=${result.id}`);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof ApiError
              ? error.message
              : "Unable to complete the assessment from chat. Open the form to finish, or try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsCompleting(false);
    }
  }, [draftId, draftBridge?.draftId, isCompleting, navigate]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode) {
      selectMode("faq");
      void sendMessage(input, "faq");
      return;
    }
    void sendMessage(input, mode);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  if (isAdminRoute) return null;

  const showWelcome = messages.length === 0 && !isSending && mode == null;
  const filledHint =
    mode === "assessment" && missingFields.length
      ? `Still need: ${missingFields
          .slice(0, 3)
          .map((f) => MISSING_LABELS[f] || f)
          .join(", ")}${missingFields.length > 3 ? "…" : ""}`
      : mode === "assessment" && readyToComplete
        ? "Draft looks complete — finish to see results."
        : null;

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
        aria-labelledby={titleId}
      >
        <header className="sv-chatbot-header">
          <div className="sv-chatbot-avatar">
            <SunMark />
          </div>
          <div className="sv-chatbot-header-text">
            <h2 id={titleId} className="sv-chatbot-title">
              SolarVy Assistant
            </h2>
            <p className="sv-chatbot-subtitle">
              {mode === "assessment"
                ? "Guided assessment · synced with form"
                : "FAQ · assessment help · next steps"}
            </p>
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

        {mode != null && (
          <div className="sv-chatbot-modebar" role="tablist" aria-label="Chat mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "faq"}
              className={`sv-chatbot-mode${mode === "faq" ? " is-active" : ""}`}
              disabled={isSending}
              onClick={() => selectMode("faq")}
            >
              Ask a question
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "assessment"}
              className={`sv-chatbot-mode${mode === "assessment" ? " is-active" : ""}`}
              disabled={isSending}
              onClick={() => {
                if (mode !== "assessment") startAssessmentMode();
              }}
            >
              Help with my assessment
            </button>
          </div>
        )}

        <div className="sv-chatbot-messages" ref={listRef} aria-live="polite">
          {showWelcome && (
            <div className="sv-chatbot-welcome">
              <strong>Hi — how can I help?</strong>
              <p>
                Assessment, solar questions, financing, or installers.
              </p>
              <div className="sv-chatbot-suggestions">
                <button
                  type="button"
                  className="sv-chatbot-suggestion is-primary"
                  disabled={isSending}
                  onClick={() => startAssessmentMode()}
                >
                  Help with my assessment
                </button>
                <button
                  type="button"
                  className="sv-chatbot-suggestion is-primary"
                  disabled={isSending}
                  onClick={() => selectMode("faq")}
                >
                  Ask a question
                </button>
              </div>
              <p className="sv-chatbot-privacy">
                AI guidance.{" "}
                <Link to="/privacy-policy" onClick={() => setOpen(false)}>
                  Privacy
                </Link>
                {" · "}
                <Link to="/contact" onClick={() => setOpen(false)}>
                  Support
                </Link>
              </p>
            </div>
          )}

          {mode === "faq" && messages.length <= 1 && (
            <div className="sv-chatbot-suggestions sv-chatbot-suggestions-inline">
              {FAQ_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="sv-chatbot-suggestion"
                  disabled={isSending}
                  onClick={() => void sendMessage(suggestion, "faq")}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {filledHint && (
            <div className="sv-chatbot-progress" role="status">
              {filledHint}
              {draftId != null && (
                <Link
                  to={`/start-assessment?draft=${draftId}`}
                  className="sv-chatbot-progress-link"
                  onClick={() => setOpen(false)}
                >
                  Open form
                </Link>
              )}
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
            <div
              className="sv-chatbot-bubble-row is-assistant"
              aria-label="Assistant is typing"
            >
              <div className="sv-chatbot-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {mode === "assessment" &&
            suggestedReplies.length > 0 &&
            !isSending && (
              <div className="sv-chatbot-suggestions sv-chatbot-suggestions-inline">
                {suggestedReplies.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="sv-chatbot-suggestion"
                    disabled={isSending}
                    onClick={() => void sendMessage(suggestion, "assessment")}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

          {mode === "assessment" && readyToComplete && !isSending && (
            <div className="sv-chatbot-complete-row">
              <button
                type="button"
                className="sv-chatbot-complete"
                disabled={isCompleting}
                onClick={() => void handleComplete()}
              >
                {isCompleting ? "Completing…" : "Complete assessment"}
              </button>
            </div>
          )}

          {lastFailedMessage && !isSending && (
            <div className="sv-chatbot-complete-row">
              <button
                type="button"
                className="sv-chatbot-suggestion"
                onClick={() =>
                  void sendMessage(lastFailedMessage, mode || "faq")
                }
              >
                Retry last message
              </button>
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
            placeholder={
              mode === "assessment"
                ? "Property, appliances, or bill…"
                : "Ask a question…"
            }
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
          Guidance only — not a site survey.{" "}
          <Link to="/privacy-policy" onClick={() => setOpen(false)}>
            Privacy
          </Link>
        </p>
      </div>

      <button
        type="button"
        className={`sv-chatbot-fab${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close SolarVy chat" : "Open SolarVy chat"}
        onClick={() => setOpen((value) => !value)}
      >
        <ChatIcon className="sv-chatbot-fab-icon sv-chatbot-fab-open" />
        <CloseIcon className="sv-chatbot-fab-icon sv-chatbot-fab-close" />
      </button>
    </div>
  );
}
