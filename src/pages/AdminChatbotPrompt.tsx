import { useEffect, useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetChatbotAssessmentPrompt,
  adminGetChatbotPrompt,
  adminSaveChatbotAssessmentPrompt,
  adminSaveChatbotPrompt,
  type AiPromptSetting,
} from "../lib/adminApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminChatbotPrompt() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [faqPrompt, setFaqPrompt] = useState("");
  const [faqMeta, setFaqMeta] = useState<AiPromptSetting | null>(null);
  const [assessmentPrompt, setAssessmentPrompt] = useState("");
  const [assessmentMeta, setAssessmentMeta] = useState<AiPromptSetting | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const [faq, assessment] = await Promise.all([
        adminGetChatbotPrompt(),
        adminGetChatbotAssessmentPrompt(),
      ]);
      setFaqMeta(faq);
      setFaqPrompt(faq.value);
      setAssessmentMeta(assessment);
      setAssessmentPrompt(assessment.value);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load AI prompts.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveFaq = async () => {
    const value = faqPrompt.trim();
    if (!value) {
      showError("FAQ prompt cannot be empty.");
      return;
    }
    setSavingFaq(true);
    clearToast();
    try {
      const saved = await adminSaveChatbotPrompt(value);
      setFaqMeta(saved);
      setFaqPrompt(saved.value);
      showSuccess(
        "FAQ / Ask-a-question mode will use this prompt on the next visitor message.",
        "FAQ prompt saved",
      );
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save FAQ prompt.",
        "Save failed",
      );
    } finally {
      setSavingFaq(false);
    }
  };

  const handleSaveAssessment = async () => {
    const value = assessmentPrompt.trim();
    if (!value) {
      showError("Assessment prompt cannot be empty.");
      return;
    }
    setSavingAssessment(true);
    clearToast();
    try {
      const saved = await adminSaveChatbotAssessmentPrompt(value);
      setAssessmentMeta(saved);
      setAssessmentPrompt(saved.value);
      showSuccess(
        "Assessment mode will use this prompt on the next guided turn.",
        "Assessment prompt saved",
      );
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Unable to save assessment prompt.",
        "Save failed",
      );
    } finally {
      setSavingAssessment(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Chatbot prompts</h1>
        <p className="admin-page-subtitle">
          Separate system prompts for FAQ chat and guided assessment mode.
          Active FAQ entries still inject into FAQ mode only.
        </p>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div>
            <h2 className="admin-panel-title" style={{ margin: 0 }}>
              Ask a question (FAQ)
            </h2>
            <div className="admin-meta">
              Last updated: {formatDate(faqMeta?.updatedAt ?? null)}
            </div>
          </div>
          <div className="admin-panel-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={isLoading || savingFaq}
              onClick={loadPrompts}
            >
              Reload
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={isLoading || savingFaq}
              onClick={handleSaveFaq}
            >
              {savingFaq ? "Saving..." : "Save FAQ prompt"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-muted">Loading prompt...</p>
        ) : (
          <textarea
            className="admin-prompt-textarea"
            value={faqPrompt}
            onChange={(e) => setFaqPrompt(e.target.value)}
            rows={16}
            spellCheck={false}
            disabled={savingFaq}
          />
        )}
      </div>

      <div className="admin-panel" style={{ marginTop: "1.25rem" }}>
        <div className="admin-panel-toolbar">
          <div>
            <h2 className="admin-panel-title" style={{ margin: 0 }}>
              Help with my assessment
            </h2>
            <div className="admin-meta">
              Last updated: {formatDate(assessmentMeta?.updatedAt ?? null)}
            </div>
          </div>
          <div className="admin-panel-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={isLoading || savingAssessment}
              onClick={handleSaveAssessment}
            >
              {savingAssessment ? "Saving..." : "Save assessment prompt"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-muted">Loading prompt...</p>
        ) : (
          <textarea
            className="admin-prompt-textarea"
            value={assessmentPrompt}
            onChange={(e) => setAssessmentPrompt(e.target.value)}
            rows={16}
            spellCheck={false}
            disabled={savingAssessment}
          />
        )}
      </div>
    </div>
  );
}
