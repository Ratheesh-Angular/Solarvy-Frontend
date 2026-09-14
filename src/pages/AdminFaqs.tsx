import { useEffect, useState } from "react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminCreateFaq,
  adminDeleteFaq,
  adminListFaqs,
  adminUpdateFaq,
  type FaqEntry,
} from "../lib/adminApi";

type FaqFormState = {
  question: string;
  answer: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FaqFormState => ({
  question: "",
  answer: "",
  sortOrder: "0",
  isActive: true,
});

export default function AdminFaqs() {
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FaqFormState>(emptyForm);

  const loadFaqs = async () => {
    setIsLoading(true);
    try {
      const data = await adminListFaqs();
      setFaqs(data);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load FAQs.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (faq: FaqEntry) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      sortOrder: String(faq.sortOrder),
      isActive: faq.isActive,
    });
  };

  const handleSave = async () => {
    const question = form.question.trim();
    const answer = form.answer.trim();
    const sortOrder = Number(form.sortOrder);

    if (!question || !answer) {
      showError("Question and answer are required.");
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      showError("Sort order must be a number.");
      return;
    }

    setIsSaving(true);
    clearToast();
    try {
      if (editingId == null) {
        await adminCreateFaq({
          question,
          answer,
          sortOrder,
          isActive: form.isActive,
        });
        showSuccess("FAQ created.", "Saved");
      } else {
        await adminUpdateFaq(editingId, {
          question,
          answer,
          sortOrder,
          isActive: form.isActive,
        });
        showSuccess("FAQ updated.", "Saved");
      }
      setEditingId(null);
      setForm(emptyForm());
      await loadFaqs();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save FAQ.",
        "Save failed",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (faq: FaqEntry) => {
    const ok = window.confirm(`Delete FAQ: “${faq.question}”?`);
    if (!ok) return;

    clearToast();
    try {
      await adminDeleteFaq(faq.id);
      if (editingId === faq.id) {
        setEditingId(null);
        setForm(emptyForm());
      }
      showSuccess("FAQ deleted.");
      await loadFaqs();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to delete FAQ.",
        "Delete failed",
      );
    }
  };

  const handleToggleActive = async (faq: FaqEntry) => {
    clearToast();
    try {
      await adminUpdateFaq(faq.id, { isActive: !faq.isActive });
      await loadFaqs();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to update FAQ.",
      );
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Chatbot FAQs</h1>
        <p className="admin-page-subtitle">
          Manage questions and answers injected into the Solarvy Assistant
          context. Inactive entries are hidden from the chatbot.
        </p>
      </div>

      <div className="admin-panel admin-faq-editor">
        <div className="admin-panel-toolbar">
          <div className="admin-meta">
            {editingId == null ? "Create new FAQ" : `Editing FAQ #${editingId}`}
          </div>
          <div className="admin-panel-actions">
            {editingId != null && (
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={isSaving}
                onClick={startCreate}
              >
                New FAQ
              </button>
            )}
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={isSaving}
              onClick={handleSave}
            >
              {isSaving ? "Saving..." : editingId == null ? "Create FAQ" : "Update FAQ"}
            </button>
          </div>
        </div>

        <div className="admin-faq-form">
          <label className="admin-field">
            <span>Question</span>
            <input
              type="text"
              className="admin-input"
              value={form.question}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, question: e.target.value }))
              }
              disabled={isSaving}
            />
          </label>
          <label className="admin-field">
            <span>Answer</span>
            <textarea
              className="admin-prompt-textarea"
              rows={5}
              value={form.answer}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, answer: e.target.value }))
              }
              disabled={isSaving}
            />
          </label>
          <div className="admin-faq-form-row">
            <label className="admin-field admin-faq-sort-field">
              <span>Sort order</span>
              <input
                type="number"
                className="admin-input"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
                disabled={isSaving}
              />
            </label>
            <label className="admin-field admin-field-checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                disabled={isSaving}
              />
              <span>Active (used by chatbot)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div className="admin-meta">
            {isLoading ? "Loading…" : `${faqs.length} FAQ${faqs.length === 1 ? "" : "s"}`}
          </div>
          <div className="admin-panel-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={isLoading}
              onClick={loadFaqs}
            >
              Reload
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-muted">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="admin-muted">No FAQs yet. Create the first one above.</p>
        ) : (
          <div className="admin-faq-list mt-3">
            {faqs.map((faq, index) => (
              <article
                key={faq.id}
                className={`admin-faq-item${faq.isActive ? "" : " is-inactive"}`}
              >
                <div className="admin-faq-item-top">
                  <h2 className="admin-faq-question">{faq.question}</h2>
                  <span className="admin-faq-badge">
                    #{index + 1}
                    {faq.isActive ? " · Active" : " · Inactive"}
                  </span>
                </div>
                <p className="admin-faq-answer">{faq.answer}</p>
                <div className="admin-faq-item-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => startEdit(faq)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => handleToggleActive(faq)}
                  >
                    {faq.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => handleDelete(faq)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
