import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetBillPrompt,
  adminSaveBillPrompt,
  type AiPromptSetting,
} from "../lib/adminApi";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminBillInput() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [prompt, setPrompt] = useState("");
  const [meta, setMeta] = useState<AiPromptSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const data = await adminGetBillPrompt();
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
      const saved = await adminSaveBillPrompt(value);
      setMeta(saved);
      setPrompt(saved.value);
      showSuccess(
        "Bill analyzer will use this prompt on the next Analyze Bill request.",
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
          Bill Input Analyzer : AI training prompt
        </h1>
        <p className="text-muted small mb-0">
          This system prompt trains the OpenAI bill analyzer used on the
          assessment Monthly Bill upload. Changes apply to the next Analyze Bill
          request.
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
