import { useMemo, useState } from "react";
import type { ActivityItem } from "../lib/adminApi";

export type VisitorSession = {
  id: string;
  visitorId: string;
  startedAt: string;
  lastSeenAt: string;
  ip: string;
  userAgent: string;
  landingPath: string;
  referrer: string;
};

type ActivityFilter = "all" | "pages" | "actions" | "forms";

type MilestoneDef = {
  id: string;
  label: string;
  match: (events: ActivityItem[]) => ActivityItem | undefined;
};

const MILESTONES: MilestoneDef[] = [
  {
    id: "visited",
    label: "Visited site",
    match: (events) =>
      events.find(
        (e) => e.eventType === "page_view" || e.eventType === "page_leave",
      ) || events[0],
  },
  {
    id: "assessment_started",
    label: "Started assessment",
    match: (events) =>
      events.find((e) => e.eventType === "assessment_started"),
  },
  {
    id: "results",
    label: "Saw results",
    match: (events) =>
      events.find(
        (e) =>
          e.eventType === "results_viewed" ||
          e.eventType === "assessment_completed",
      ),
  },
  {
    id: "pdf",
    label: "Downloaded PDF",
    match: (events) => events.find((e) => e.eventType === "pdf_download"),
  },
  {
    id: "installers",
    label: "Viewed installers",
    match: (events) =>
      events.find((e) => e.eventType === "matched_installers_viewed"),
  },
  {
    id: "intro",
    label: "Requested intro",
    match: (events) =>
      events.find((e) => e.eventType === "request_intro_submitted"),
  },
  {
    id: "expert",
    label: "Expert review",
    match: (events) =>
      events.find((e) => e.eventType === "expert_review_submitted"),
  },
  {
    id: "quote",
    label: "Uploaded quote",
    match: (events) =>
      events.find((e) => e.eventType === "quote_upload_submitted"),
  },
];

const PAGE_LABELS: Array<{ test: RegExp | string; label: string }> = [
  { test: /^\/$/, label: "Home" },
  { test: "/start-assessment", label: "Start assessment" },
  { test: "/assessment-result", label: "Assessment results" },
  { test: "/matched-installers", label: "Matched installers" },
  { test: "/request-intro", label: "Request introduction" },
  { test: "/expert-review", label: "Expert review" },
  { test: "/about", label: "About" },
  { test: "/contact", label: "Contact" },
  { test: "/faq", label: "FAQ" },
];

const CTA_LABELS: Record<string, string> = {
  request_intro: "Clicked Request Introduction",
  expert_review: "Clicked Expert Review",
  quote_upload: "Clicked Upload Quote",
  matched_installers: "Clicked View Installers",
  download_pdf: "Clicked Download PDF",
  start_assessment: "Clicked Start Assessment",
};

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

function formatShortTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function friendlyPath(path: string): string {
  if (!path) return "Unknown page";
  const pathname = path.split("?")[0] || path;
  for (const entry of PAGE_LABELS) {
    if (typeof entry.test === "string") {
      if (pathname === entry.test || pathname.startsWith(entry.test)) {
        return entry.label;
      }
    } else if (entry.test.test(pathname)) {
      return entry.label;
    }
  }
  return pathname;
}

function eventCategory(
  eventType: string,
): "pages" | "actions" | "forms" | "other" {
  if (eventType === "page_view" || eventType === "page_leave") return "pages";
  if (
    eventType === "request_intro_submitted" ||
    eventType === "expert_review_submitted" ||
    eventType === "quote_upload_submitted"
  ) {
    return "forms";
  }
  if (
    eventType === "results_viewed" ||
    eventType === "pdf_download" ||
    eventType === "matched_installers_viewed" ||
    eventType === "cta_click" ||
    eventType === "assessment_started" ||
    eventType === "assessment_completed"
  ) {
    return "actions";
  }
  return "other";
}

function eventTitle(event: ActivityItem): string {
  const meta = (event.metadata || {}) as Record<string, unknown>;
  switch (event.eventType) {
    case "page_view":
      return `Visited ${friendlyPath(event.path)}`;
    case "page_leave":
      return `Left ${friendlyPath(event.path)}`;
    case "assessment_started":
      return "Started assessment";
    case "assessment_completed":
      return "Completed assessment";
    case "results_viewed":
      return "Viewed assessment results";
    case "pdf_download":
      return "Downloaded PDF report";
    case "matched_installers_viewed":
      return "Viewed matched installers";
    case "request_intro_submitted":
      return "Submitted request introduction";
    case "expert_review_submitted":
      return "Submitted expert review";
    case "quote_upload_submitted":
      return "Uploaded a quote";
    case "cta_click": {
      const cta = String(meta.cta || "");
      return CTA_LABELS[cta] || `Clicked ${cta.replace(/_/g, " ") || "CTA"}`;
    }
    default:
      return event.eventType.replace(/_/g, " ");
  }
}

function durationFromMeta(event: ActivityItem): number | null {
  const raw = (event.metadata || {}).durationMs;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function buildDurationMap(events: ActivityItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.eventType !== "page_leave") continue;
    const ms = durationFromMeta(event);
    if (ms == null) continue;
    const key = event.path || "";
    map.set(key, (map.get(key) || 0) + ms);
  }
  return map;
}

type Props = {
  timeline: ActivityItem[];
  sessions: VisitorSession[];
};

export default function AdminUserActivityTab({ timeline, sessions }: Props) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    null,
  );

  const sortedAsc = useMemo(
    () =>
      [...timeline].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [timeline],
  );

  const sortedDesc = useMemo(
    () =>
      [...timeline].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [timeline],
  );

  const milestones = useMemo(
    () =>
      MILESTONES.map((def) => {
        const hit = def.match(sortedAsc);
        return {
          id: def.id,
          label: def.label,
          done: Boolean(hit),
          at: hit?.createdAt || null,
        };
      }),
    [sortedAsc],
  );

  const sessionCards = useMemo(() => {
    const bySession = new Map<string, ActivityItem[]>();
    for (const event of sortedAsc) {
      const key = event.sessionId || "_none";
      const list = bySession.get(key) || [];
      list.push(event);
      bySession.set(key, list);
    }

    const sessionMeta = new Map(sessions.map((s) => [s.id, s]));

    const keys = [
      ...sessions.map((s) => s.id),
      ...[...bySession.keys()].filter(
        (k) => k !== "_none" && !sessionMeta.has(k),
      ),
      ...(bySession.has("_none") ? ["_none"] : []),
    ];

    const uniqueKeys = [...new Set(keys)];

    return uniqueKeys
      .map((sessionId) => {
        const events = bySession.get(sessionId) || [];
        if (events.length === 0 && sessionId === "_none") return null;

        const meta = sessionMeta.get(sessionId);
        const startIso =
          meta?.startedAt || events[0]?.createdAt || new Date().toISOString();
        const endIso =
          meta?.lastSeenAt ||
          events[events.length - 1]?.createdAt ||
          startIso;
        const durationMs =
          new Date(endIso).getTime() - new Date(startIso).getTime();

        const durationByPath = buildDurationMap(events);
        const pages: Array<{ path: string; label: string; durationMs: number }> =
          [];
        const seenPaths = new Set<string>();
        for (const event of events) {
          if (event.eventType !== "page_view") continue;
          const path = event.path || "";
          if (seenPaths.has(path)) continue;
          seenPaths.add(path);
          pages.push({
            path,
            label: friendlyPath(path),
            durationMs: durationByPath.get(path) || 0,
          });
        }

        const actions = events.filter(
          (e) =>
            e.eventType !== "page_view" && e.eventType !== "page_leave",
        );

        const story = events
          .filter((e) => e.eventType !== "page_leave")
          .map((e) => {
            const leaveMs =
              e.eventType === "page_view"
                ? durationByPath.get(e.path || "") || null
                : null;
            return {
              id: e.id,
              at: e.createdAt,
              title: eventTitle(e),
              category: eventCategory(e.eventType),
              durationLabel:
                leaveMs != null && leaveMs > 0
                  ? formatDuration(leaveMs)
                  : null,
            };
          });

        return {
          id: sessionId,
          startIso,
          durationLabel: durationMs > 0 ? formatDuration(durationMs) : "—",
          pageCount: pages.length,
          actionCount: actions.length,
          pages,
          actions,
          story,
          landingPath: meta?.landingPath || pages[0]?.path || "",
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      startIso: string;
      durationLabel: string;
      pageCount: number;
      actionCount: number;
      pages: Array<{ path: string; label: string; durationMs: number }>;
      actions: ActivityItem[];
      story: Array<{
        id: number;
        at: string;
        title: string;
        category: string;
        durationLabel: string | null;
      }>;
      landingPath: string;
    }>;
  }, [sortedAsc, sessions]);

  const feedItems = useMemo(() => {
    const durationByPath = buildDurationMap(sortedAsc);
    return sortedDesc
      .filter((e) => e.eventType !== "page_leave")
      .filter((e) => {
        if (filter === "all") return true;
        return eventCategory(e.eventType) === filter;
      })
      .map((e) => {
        const cat = eventCategory(e.eventType);
        const leaveMs =
          e.eventType === "page_view"
            ? durationByPath.get(e.path || "") || null
            : null;
        return {
          id: e.id,
          at: e.createdAt,
          title: eventTitle(e),
          category: cat,
          pathLabel:
            e.eventType === "page_view" || e.path
              ? friendlyPath(e.path)
              : null,
          durationLabel:
            leaveMs != null && leaveMs > 0 ? formatDuration(leaveMs) : null,
        };
      });
  }, [sortedAsc, sortedDesc, filter]);

  if (timeline.length === 0 && sessions.length === 0) {
    return (
      <div className="admin-activity">
        <div className="admin-activity-empty">
          <p className="admin-empty-text">No activity recorded yet.</p>
          <p className="admin-muted">
            Activity appears after this user visits the public Solarvy site —
            pages, time spent, downloads, and form submissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-activity">
      <section className="admin-activity-section" aria-labelledby="activity-milestones">
        <div className="admin-activity-section-head">
          <h2 id="activity-milestones" className="admin-panel-title">
            Journey milestones
          </h2>
          <p className="admin-muted">
            Key steps this user has completed on Solarvy.
          </p>
        </div>
        <ol className="admin-milestone-strip">
          {milestones.map((m) => (
            <li
              key={m.id}
              className={`admin-milestone admin-milestone--${m.id}${m.done ? " is-done" : ""}`}
            >
              <span className="admin-milestone-mark" aria-hidden>
                {m.done ? "✓" : ""}
              </span>
              <span className="admin-milestone-label">{m.label}</span>
              <span className="admin-milestone-time">
                {m.done && m.at ? formatShortTime(m.at) : "Not yet"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="admin-activity-section" aria-labelledby="activity-sessions">
        <div className="admin-activity-section-head">
          <h2 id="activity-sessions" className="admin-panel-title">
            Sessions
          </h2>
          <p className="admin-muted">
            Visits grouped into sessions with pages and actions.
          </p>
        </div>

        {sessionCards.length === 0 ? (
          <p className="admin-empty-text">No sessions yet.</p>
        ) : (
          <div className="admin-session-list">
            {sessionCards.map((session) => {
              const open = expandedSessionId === session.id;
              return (
                <article
                  key={session.id}
                  className={`admin-session-card${open ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="admin-session-card-toggle"
                    onClick={() =>
                      setExpandedSessionId(open ? null : session.id)
                    }
                    aria-expanded={open}
                  >
                    <div className="admin-session-card-main">
                      <strong>{formatShortTime(session.startIso)}</strong>
                      <span className="admin-muted">
                        {session.durationLabel} · {session.pageCount} page
                        {session.pageCount === 1 ? "" : "s"} ·{" "}
                        {session.actionCount} action
                        {session.actionCount === 1 ? "" : "s"}
                      </span>
                      {session.pages.length > 0 ? (
                        <div className="admin-session-path" aria-hidden>
                          {session.pages.map((p, idx) => (
                            <span key={`${session.id}-${p.path}-${idx}`}>
                              {idx > 0 ? (
                                <span className="admin-session-path-sep">→</span>
                              ) : null}
                              <span className="admin-session-path-page">
                                {p.label}
                                {p.durationMs > 0
                                  ? ` · ${formatDuration(p.durationMs)}`
                                  : ""}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {session.actions.length > 0 ? (
                        <div className="admin-session-chips">
                          {session.actions.slice(0, 6).map((a) => (
                            <span
                              key={a.id}
                              className={`admin-activity-chip admin-activity-chip--${eventCategory(a.eventType)}`}
                            >
                              {eventTitle(a)}
                            </span>
                          ))}
                          {session.actions.length > 6 ? (
                            <span className="admin-activity-chip">
                              +{session.actions.length - 6} more
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span className="admin-lead-chevron">
                      {open ? "Hide" : "View"}
                    </span>
                  </button>

                  {open ? (
                    <ol className="admin-session-story">
                      {session.story.map((row) => (
                        <li key={row.id}>
                          <time className="admin-session-story-time">
                            {formatShortTime(row.at)}
                          </time>
                          <div className="admin-session-story-body">
                            <span
                              className={`admin-activity-badge admin-activity-badge--${row.category}`}
                            >
                              {row.category === "pages"
                                ? "Page"
                                : row.category === "forms"
                                  ? "Form"
                                  : "Action"}
                            </span>
                            <span>
                              {row.title}
                              {row.durationLabel
                                ? ` · ${row.durationLabel}`
                                : ""}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-activity-section" aria-labelledby="activity-feed">
        <div className="admin-activity-section-head admin-activity-feed-head">
          <div>
            <h2 id="activity-feed" className="admin-panel-title">
              Activity feed
            </h2>
            <p className="admin-muted">Full event history for this user.</p>
          </div>
          <div className="admin-activity-filters" role="tablist" aria-label="Filter activity">
            {(
              [
                ["all", "All"],
                ["pages", "Pages"],
                ["actions", "Actions"],
                ["forms", "Forms"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`admin-activity-filter admin-activity-filter--${key}${filter === key ? " is-active" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {feedItems.length === 0 ? (
          <p className="admin-empty-text">No events in this filter.</p>
        ) : (
          <ol className="admin-activity-feed">
            {feedItems.map((item) => (
              <li key={item.id}>
                <time className="admin-activity-feed-time">
                  {formatShortTime(item.at)}
                </time>
                <div className="admin-activity-feed-body">
                  <span
                    className={`admin-activity-badge admin-activity-badge--${item.category}`}
                  >
                    {item.category === "pages"
                      ? "Page"
                      : item.category === "forms"
                        ? "Form"
                        : "Action"}
                  </span>
                  <div className="admin-activity-feed-copy">
                    <strong>{item.title}</strong>
                    {item.durationLabel || item.pathLabel ? (
                      <span className="admin-muted">
                        {[item.pathLabel, item.durationLabel]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
