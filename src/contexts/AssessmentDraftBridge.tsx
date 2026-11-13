import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AssessmentFormData } from "../types/assessment";

const DRAFT_STORAGE_KEY = "solarvy_assessment_draft_id";
export const DRAFT_BRIDGE_EVENT = "solarvy:assessment-draft";

export type DraftBridgeSnapshot = {
  draftId: number | null;
  formData: AssessmentFormData | null;
  source: "form" | "chat" | "hydrate" | null;
  updatedAt: number;
};

type AssessmentDraftBridgeValue = DraftBridgeSnapshot & {
  setDraft: (
    draftId: number | null,
    formData?: AssessmentFormData | null,
    source?: DraftBridgeSnapshot["source"],
  ) => void;
  clearDraft: () => void;
};

const AssessmentDraftBridgeContext =
  createContext<AssessmentDraftBridgeValue | null>(null);

function readStoredDraftId(): number | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeStoredDraftId(draftId: number | null) {
  try {
    if (draftId == null) localStorage.removeItem(DRAFT_STORAGE_KEY);
    else localStorage.setItem(DRAFT_STORAGE_KEY, String(draftId));
  } catch {
    /* ignore */
  }
}

function emitBridgeEvent(snapshot: DraftBridgeSnapshot) {
  try {
    window.dispatchEvent(
      new CustomEvent(DRAFT_BRIDGE_EVENT, { detail: snapshot }),
    );
  } catch {
    /* ignore */
  }
}

export function AssessmentDraftBridgeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [draftId, setDraftId] = useState<number | null>(() =>
    readStoredDraftId(),
  );
  const [formData, setFormData] = useState<AssessmentFormData | null>(null);
  const [source, setSource] = useState<DraftBridgeSnapshot["source"]>(null);
  const [updatedAt, setUpdatedAt] = useState(0);

  const setDraft = useCallback(
    (
      nextId: number | null,
      nextForm?: AssessmentFormData | null,
      nextSource: DraftBridgeSnapshot["source"] = "hydrate",
    ) => {
      setDraftId(nextId);
      writeStoredDraftId(nextId);
      if (nextForm !== undefined) setFormData(nextForm);
      setSource(nextSource);
      const stamp = Date.now();
      setUpdatedAt(stamp);
      emitBridgeEvent({
        draftId: nextId,
        formData: nextForm === undefined ? formData : nextForm,
        source: nextSource,
        updatedAt: stamp,
      });
    },
    [formData],
  );

  const clearDraft = useCallback(() => {
    setDraft(null, null, null);
  }, [setDraft]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DRAFT_STORAGE_KEY) return;
      const n = Number(event.newValue);
      const next = Number.isInteger(n) && n > 0 ? n : null;
      setDraftId(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      draftId,
      formData,
      source,
      updatedAt,
      setDraft,
      clearDraft,
    }),
    [draftId, formData, source, updatedAt, setDraft, clearDraft],
  );

  return (
    <AssessmentDraftBridgeContext.Provider value={value}>
      {children}
    </AssessmentDraftBridgeContext.Provider>
  );
}

export function useAssessmentDraftBridge() {
  const ctx = useContext(AssessmentDraftBridgeContext);
  if (!ctx) {
    throw new Error(
      "useAssessmentDraftBridge must be used within AssessmentDraftBridgeProvider",
    );
  }
  return ctx;
}

/** Optional hook that returns null outside the provider (for safety). */
export function useOptionalAssessmentDraftBridge() {
  return useContext(AssessmentDraftBridgeContext);
}
