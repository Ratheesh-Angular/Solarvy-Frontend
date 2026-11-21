import { useState } from "react";
import {
  PROJECT_ACTION_STATUS_LABELS,
  type ProjectActionStatus,
} from "../lib/adminApi";

const NOTES_MAX_LENGTH = 5000;

const STATUS_ORDER: ProjectActionStatus[] = [
  "submitted",
  "in_progress",
  "awaiting_customer",
  "completed",
];

const STATUS_HINTS: Record<ProjectActionStatus, string> = {
  submitted: "Received; not started yet.",
  in_progress: "You are actively working on this request.",
  awaiting_customer: "Waiting on the customer to respond.",
  completed: "No further action needed.",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

type AdminActionStatusPanelProps = {
  status: ProjectActionStatus;
  adminNotes: string;
  statusUpdatedAt?: string | null;
  updatedAt?: string | null;
  /** Explains to the admin what changing the status sends to the customer. */
  emailHint?: string;
  onSave: (next: {
    status: ProjectActionStatus;
    adminNotes: string;
  }) => Promise<void>;
};

export default function AdminActionStatusPanel({
  status: initialStatus,
  adminNotes: initialNotes,
  statusUpdatedAt,
  updatedAt,
  emailHint = "Changing the status emails the customer and updates their project space.",
  onSave,
}: AdminActionStatusPanelProps) {
  const [status, setStatus] = useState<ProjectActionStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const dirty = status !== initialStatus || notes.trim() !== (initialNotes || "");

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      await onSave({ status, adminNotes: notes.trim() });
      setMessage({ tone: "success", text: "Status saved." });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Failed to save status",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-panel admin-fin-review">
      <h2 className="admin-panel-title">Status &amp; review</h2>
      <p className="admin-panel-lead">{emailHint}</p>

      <span className="admin-label">Status</span>
      <div
        className="admin-fin-status-options"
        role="radiogroup"
        aria-label="Review status"
      >
        {STATUS_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={status === option}
            className={`admin-fin-status-option${
              status === option ? " is-active" : ""
            }`}
            onClick={() => {
              setStatus(option);
              setMessage(null);
            }}
          >
            <span className="admin-fin-status-dot" aria-hidden />
            <span className="admin-fin-status-option-copy">
              <strong>{PROJECT_ACTION_STATUS_LABELS[option]}</strong>
              <small>{STATUS_HINTS[option]}</small>
            </span>
          </button>
        ))}
      </div>

      <label className="admin-label" htmlFor="admin-action-notes">
        Internal notes
      </label>
      <textarea
        id="admin-action-notes"
        className="admin-prompt-textarea admin-fin-notes-input"
        value={notes}
        maxLength={NOTES_MAX_LENGTH}
        placeholder="e.g. Shared the request with the installer, waiting for a reply…"
        onChange={(e) => {
          setNotes(e.target.value);
          setMessage(null);
        }}
      />
      <p className="admin-file-meta admin-fin-notes-count">
        {notes.length} / {NOTES_MAX_LENGTH}
      </p>

      {message ? (
        <p
          className={`admin-fin-save-msg admin-fin-save-msg--${message.tone}`}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="button"
        className="admin-btn admin-btn-primary admin-btn-block"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save status"}
      </button>

      <dl className="admin-fin-meta">
        <div>
          <dt>Status changed</dt>
          <dd>{formatDateTime(statusUpdatedAt)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(updatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
