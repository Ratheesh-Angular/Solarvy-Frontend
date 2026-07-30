import { useCallback, useEffect, useRef, useState } from "react";

export type FeedbackToastType = "success" | "error";

export type FeedbackToastState = {
  type: FeedbackToastType;
  message: string;
  title?: string;
};

const SUCCESS_DISMISS_MS = 4000;

export function useFeedbackToast() {
  const [toast, setToast] = useState<FeedbackToastState | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const clearToast = useCallback(() => {
    clearDismissTimer();
    setToast(null);
  }, [clearDismissTimer]);

  const showSuccess = useCallback(
    (message: string, title = "Success") => {
      clearDismissTimer();
      setToast({ type: "success", message, title });
      dismissTimerRef.current = window.setTimeout(() => {
        setToast(null);
        dismissTimerRef.current = null;
      }, SUCCESS_DISMISS_MS);
    },
    [clearDismissTimer],
  );

  const showError = useCallback(
    (message: string, title = "Something went wrong") => {
      clearDismissTimer();
      setToast({ type: "error", message, title });
    },
    [clearDismissTimer],
  );

  useEffect(() => () => clearDismissTimer(), [clearDismissTimer]);

  return { toast, showSuccess, showError, clearToast };
}
