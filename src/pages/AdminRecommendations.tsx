import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetRecommendationPrompt,
  adminSaveRecommendationPrompt,
  type AiPromptSetting,
} from "../lib/adminApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminRecommendations() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [prompt, setPrompt] = useState("");
  const [meta, setMeta] = useState<AiPromptSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const data = await adminGetRecommendationPrompt();
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
      const saved = await adminSaveRecommendationPrompt(value);
      setMeta(saved);
      setPrompt(saved.value);
      showSuccess(
        "Recommendations will use this prompt on the next assessment that does not already have stored AI text.",
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

      <div className="mb-4">
        <h1 className="h4 fw-bold mb-1">
          AI Recommendation : training prompt
        </h1>
        <p className="text-muted small mb-2">
          This system prompt trains OpenAI to write the AI Recommendation on
          the assessment results page. The model receives the full assessment
          form and all Excel outputs as JSON under ASSESSMENT_CONTEXT.
        </p>
        <p className="text-muted small mb-0">
          Available form values include property type, template, country, city,
          power setup, objective, input method, roof area, backup duration,
          bill fields, and appliance or custom load rows. Excel values include
          sizing, costs, savings, payback, diesel, shares, system class,
          primaryRecommendation, confidenceNote, disclaimer, the strategy
          comparison table, and summary cells. Changes apply to new completions
          and to assessments that do not yet have stored AI text.
        </p>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="small text-muted">
              Last updated: {formatDate(meta?.updatedAt ?? null)}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={isLoading || isSaving}
                onClick={loadPrompt}
              >
                Reload
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={isLoading || isSaving}
                onClick={handleSave}
              >
                {isSaving ? "Saving..." : "Save prompt"}
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted mb-0">Loading prompt...</p>
          ) : (
            <textarea
              className="form-control admin-prompt-textarea font-monospace"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={22}
              spellCheck={false}
              disabled={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
