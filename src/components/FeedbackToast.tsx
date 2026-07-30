import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import type { FeedbackToastState } from "../hooks/useFeedbackToast";

type FeedbackToastProps = {
  toast: FeedbackToastState | null;
  onClose: () => void;
};

export default function FeedbackToast({ toast, onClose }: FeedbackToastProps) {
  if (!toast || typeof document === "undefined") return null;

  const isError = toast.type === "error";

  return createPortal(
    <div className="feedback-toast-stack">
      <div
        className={`feedback-toast feedback-toast--${toast.type}`}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
      >
        {isError ? (
          <AlertCircle className="feedback-toast-icon" aria-hidden />
        ) : (
          <CheckCircle2 className="feedback-toast-icon" aria-hidden />
        )}
        <div className="feedback-toast-body">
          <p className="feedback-toast-title">{toast.title}</p>
          <p className="feedback-toast-message">{toast.message}</p>
        </div>
        <button
          type="button"
          className="feedback-toast-close"
          aria-label="Dismiss notification"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  );
}
