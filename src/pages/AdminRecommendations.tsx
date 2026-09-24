import { useEffect, useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetQuickSnapshotRecommendationPrompt,
  adminGetRecommendationPrompt,
  adminSaveQuickSnapshotRecommendationPrompt,
  adminSaveRecommendationPrompt,
  type AiPromptSetting,
} from "../lib/adminApi";

type RecommendationTab = "assessment-result" | "quick-snapshot";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminRecommendations() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [tab, setTab] = useState<RecommendationTab>("assessment-result");
  const [prompt, setPrompt] = useState("");
  const [meta, setMeta] = useState<AiPromptSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isQuickSnapshot = tab === "quick-snapshot";

  const loadPrompt = async (activeTab: RecommendationTab = tab) => {
    setIsLoading(true);
    try {
      const data =
        activeTab === "quick-snapshot"
          ? await adminGetQuickSnapshotRecommendationPrompt()
          : await adminGetRecommendationPrompt();
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
    loadPrompt(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSave = async () => {
    const value = prompt.trim();
    if (!value) {
      showError("Prompt cannot be empty.");
      return;
    }

    setIsSaving(true);
    clearToast();
    try {
      const saved = isQuickSnapshot
        ? await adminSaveQuickSnapshotRecommendationPrompt(value)
        : await adminSaveRecommendationPrompt(value);
      setMeta(saved);
      setPrompt(saved.value);
      showSuccess(
        isQuickSnapshot
          ? "Quick Snapshot recommendations will use this prompt on the next assessment that does not already have stored Quick Snapshot AI text."
          : "Recommendations will use this prompt on the next assessment that does not already have stored AI text.",
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
        <h1 className="admin-page-title">
          AI Recommendation : training prompt
        </h1>
        <p className="admin-page-subtitle">
          {isQuickSnapshot
            ? "This system prompt trains OpenAI to write the short “What this means” blurb inside Quick Snapshot on the assessment results page. The model receives the full assessment form and all Excel outputs as JSON under ASSESSMENT_CONTEXT."
            : "This system prompt trains OpenAI to write the AI Recommendation on the assessment results page. The model receives the full assessment form and all Excel outputs as JSON under ASSESSMENT_CONTEXT."}
        </p>
        <p className="admin-page-subtitle">
          Available form values include property type, template, country, city,
          power setup, objective, input method, roof area, backup duration, bill
          fields, and appliance or custom load rows. Excel values include sizing,
          costs, savings, payback, diesel, shares, system class,
          primaryRecommendation, confidenceNote, disclaimer, the strategy
          comparison table, and summary cells. Changes apply to new completions
          and to assessments that do not yet have stored AI text
          {isQuickSnapshot ? " for Quick Snapshot" : ""}.
        </p>
      </div>

      <div className="admin-tabs">
        {(
          [
            ["assessment-result", "Assessment Result Recommendation"],
            ["quick-snapshot", "Quick Snapshot Recommendation"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`admin-tab${tab === key ? " is-active" : ""}`}
            onClick={() => setTab(key)}
            disabled={isSaving}
          >
            {label}
          </button>
        ))}
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
              onClick={() => loadPrompt(tab)}
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
