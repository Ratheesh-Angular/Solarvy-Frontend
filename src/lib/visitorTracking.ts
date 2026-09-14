import { apiPost, buildApiUrl } from "./api";

const VISITOR_KEY = "solarvy_visitor_id";
const SESSION_KEY = "solarvy_session_id";

export type TrackingEventType =
  | "page_view"
  | "page_leave"
  | "assessment_started"
  | "assessment_completed"
  | "request_intro_submitted"
  | "expert_review_submitted"
  | "quote_upload_submitted"
  | "results_viewed"
  | "pdf_download"
  | "matched_installers_viewed"
  | "cta_click";

export type CtaId =
  | "request_intro"
  | "expert_review"
  | "quote_upload"
  | "matched_installers"
  | "download_pdf"
  | "start_assessment";

function createUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = createUuid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return createUuid();
  }
}

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setSessionId(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    // ignore
  }
}

let sessionPromise: Promise<{ visitorId: string; sessionId: string }> | null =
  null;

export async function ensureTrackingSession(extra?: {
  city?: string;
  region?: string;
  country?: string;
}): Promise<{ visitorId: string; sessionId: string }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const visitorId = getVisitorId();
      const existingSessionId = getSessionId();
      const data = await apiPost<{
        success: boolean;
        data?: { visitorId: string; sessionId: string };
      }>("/tracking/session", {
        visitorId,
        sessionId: existingSessionId,
        landingPath: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        city: extra?.city || "",
        region: extra?.region || "",
        country: extra?.country || "",
      });

      const result = {
        visitorId: data.data?.visitorId || visitorId,
        sessionId: data.data?.sessionId || existingSessionId || createUuid(),
      };

      try {
        localStorage.setItem(VISITOR_KEY, result.visitorId);
      } catch {
        // ignore
      }
      setSessionId(result.sessionId);
      return result;
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }

  return sessionPromise;
}

type TrackOptions = {
  path?: string;
  entityType?: string;
  entityId?: string | number;
  metadata?: Record<string, unknown>;
};

function buildEventPayload(
  eventType: TrackingEventType,
  visitorId: string,
  sessionId: string | null,
  options: TrackOptions,
) {
  return {
    visitorId,
    sessionId,
    eventType,
    path: options.path || window.location.pathname,
    entityType: options.entityType || "",
    entityId: options.entityId != null ? String(options.entityId) : "",
    metadata: options.metadata || {},
  };
}

export async function trackEvent(
  eventType: TrackingEventType,
  options: TrackOptions = {},
) {
  try {
    const { visitorId, sessionId } = await ensureTrackingSession();
    await apiPost("/tracking/events", buildEventPayload(eventType, visitorId, sessionId, options));
  } catch {
    // Tracking must never break the product UX.
  }
}

/** Best-effort flush for unload / route leave (sendBeacon when available). */
export function trackEventBeacon(
  eventType: TrackingEventType,
  options: TrackOptions = {},
) {
  try {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const payload = JSON.stringify(
      buildEventPayload(eventType, visitorId, sessionId, options),
    );
    const url = buildApiUrl("/tracking/events");

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) return;
    }

    void trackEvent(eventType, options);
  } catch {
    // Tracking must never break the product UX.
  }
}

export async function trackPageView(path?: string) {
  await trackEvent("page_view", {
    path: path || window.location.pathname + window.location.search,
  });
}

export function trackPageLeave(path: string, durationMs: number) {
  if (!path || durationMs < 0) return;
  trackEventBeacon("page_leave", {
    path,
    metadata: { durationMs: Math.round(durationMs) },
  });
}

export async function trackCtaClick(
  cta: CtaId,
  options: {
    path?: string;
    entityType?: string;
    entityId?: string | number;
    metadata?: Record<string, unknown>;
  } = {},
) {
  await trackEvent("cta_click", {
    path: options.path,
    entityType: options.entityType,
    entityId: options.entityId,
    metadata: { cta, ...(options.metadata || {}) },
  });
}
