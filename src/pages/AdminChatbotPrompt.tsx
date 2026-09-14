import { useEffect, useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetChatbotPrompt,
  adminSaveChatbotPrompt,
  type AiPromptSetting,
} from "../lib/adminApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminChatbotPrompt() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [prompt, setPrompt] = useState("");
  const [meta, setMeta] = useState<AiPromptSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const data = await adminGetChatbotPrompt();
      setMeta(data);
      setPrompt(data.value);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load AI prompt.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const value = prompt.trim();
    if (!value) {
      showError("Prompt cannot be empty.");
      return;
    }

    setIsSaving(true);
    clearToast();
    try {
      const saved = await adminSaveChatbotPrompt(value);
      setMeta(saved);
      setPrompt(saved.value);
      showSuccess(
        "Website chatbot will use this prompt on the next visitor message.",
        "Prompt saved",
      );
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save prompt.",
        "Save failed",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Chatbot : AI training prompt</h1>
        <p className="admin-page-subtitle">
          This system prompt trains the site-wide Solarvy Assistant. Combine it
          with active FAQ entries to guide tone, scope, and redirects for
          unsupported questions.
        </p>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div className="admin-meta">
            Last updated: {formatDate(meta?.updatedAt ?? null)}
          </div>
          <div className="admin-panel-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={isLoading || isSaving}
              onClick={loadPrompt}
            >
              Reload
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={isLoading || isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : "Save prompt"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-muted">Loading prompt...</p>
        ) : (
          <textarea
            className="admin-prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={22}
            spellCheck={false}
            disabled={isSaving}
          />
        )}
      </div>
    </div>
  );
}
