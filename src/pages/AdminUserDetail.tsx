import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminUserActivityTab, {
  type VisitorSession,
} from "../components/AdminUserActivityTab";
import {
  adminDownloadLeadFile,
  adminGetVisitorDetail,
  adminListAssessments,
  adminListExpertReviews,
  adminListQuoteUploads,
  adminListRequestIntros,
  type ActivityItem,
  type VisitorSummary,
} from "../lib/adminApi";

type UserTab =
  | "activity"
  | "assessments"
  | "request-intros"
  | "expert-reviews"
  | "quote-uploads";

function formatLocation(visitor: VisitorSummary) {
  return [visitor.lastCity, visitor.lastRegion, visitor.lastCountry]
    .filter(Boolean)
    .join(", ");
}

function valueOrDash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

function asActivityItems(value: unknown): ActivityItem[] {
  if (!Array.isArray(value)) return [];
  return value as ActivityItem[];
}

function asSessions(value: unknown): VisitorSession[] {
  if (!Array.isArray(value)) return [];
  return value as VisitorSession[];
}

export default function AdminUserDetail() {
  const { id = "" } = useParams();
  const [visitor, setVisitor] = useState<VisitorSummary | null>(null);
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [tab, setTab] = useState<UserTab>("activity");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [tabLoading, setTabLoading] = useState(true);
  const [tabError, setTabError] = useState("");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError("");
      try {
        const data = await adminGetVisitorDetail(id);
        if (!cancelled) {
          setVisitor((data.visitor as VisitorSummary) || null);
          setTimeline(asActivityItems(data.timeline));
          setSessions(asSessions(data.sessions));
        }
      } catch (err) {
        if (!cancelled) {
          setProfileError(
            err instanceof Error ? err.message : "Failed to load user",
          );
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (tab === "activity") {
      setTabLoading(false);
      setTabError("");
      setItems([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    (async () => {
      setTabLoading(true);
      setTabError("");
      try {
        const loader =
          tab === "assessments"
            ? adminListAssessments
            : tab === "request-intros"
              ? adminListRequestIntros
              : tab === "expert-reviews"
                ? adminListExpertReviews
                : adminListQuoteUploads;
        const data = await loader({ visitorId: id, page, limit });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setTabError(
            err instanceof Error ? err.message : "Failed to load records",
          );
        }
      } finally {
        if (!cancelled) setTabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (profileLoading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading user…</p>
      </div>
    );
  }

  if (profileError || !visitor) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">
          {profileError || "User not found"}
        </div>
        <Link to="/admin/users" className="admin-btn admin-btn-secondary">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page-inner admin-user-detail">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <p className="admin-eyebrow">User</p>
          <h1 className="admin-page-title admin-user-title">
            {visitor.displayName || "user_—"}
          </h1>
          <p className="admin-page-subtitle admin-user-meta">
            <code className="admin-code">{visitor.id}</code>
            <span className="admin-meta-sep">·</span>
            Last seen {new Date(visitor.lastSeenAt).toLocaleString()}
            {formatLocation(visitor) ? (
              <>
                <span className="admin-meta-sep">·</span>
                {formatLocation(visitor)}
              </>
            ) : null}
          </p>
        </div>
        <Link to="/admin/users" className="admin-btn admin-btn-secondary">
          Back
        </Link>
      </div>

      <div className="admin-tabs admin-user-tabs">
        {(
          [
            ["activity", "Activity"],
            ["assessments", "Assessments"],
            ["request-intros", "Request Intro"],
            ["expert-reviews", "Expert Review"],
            ["quote-uploads", "Quote Upload"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`admin-tab${tab === key ? " is-active" : ""}`}
            onClick={() => {
              setTab(key);
              setPage(1);
              setExpandedId(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tabError ? <div className="admin-panel admin-alert">{tabError}</div> : null}

      {tab === "activity" ? (
        <div className="admin-panel admin-user-tab-panel admin-user-activity-panel">
          <AdminUserActivityTab timeline={timeline} sessions={sessions} />
        </div>
      ) : (
        <div className="admin-panel admin-user-tab-panel">
          {tabLoading ? (
            <p className="admin-empty-text">Loading…</p>
          ) : items.length === 0 ? (
            <p className="admin-empty-text">No records for this tab.</p>
          ) : tab === "assessments" ? (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table-clickable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Created</th>
                    <th>Location</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const form = (row.formData || {}) as Record<string, unknown>;
                    const location = [form.country, form.city]
                      .filter(Boolean)
                      .join(" / ");
                    return (
                      <tr key={String(row.id)}>
                        <td>
                          <strong>{String(row.id)}</strong>
                        </td>
                        <td>
                          {row.createdAt
                            ? new Date(String(row.createdAt)).toLocaleString()
                            : "—"}
                        </td>
                        <td>{location || "—"}</td>
                        <td>
                          <Link
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            to={`/admin/users/${id}/assessments/${row.id}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : tab === "request-intros" ? (
            <div className="admin-lead-list">
              {items.map((row) => {
                const open = expandedId === row.id;
                const name = valueOrDash(row.full_name);
                const initial =
                  name !== "—" ? name.trim().charAt(0).toUpperCase() : "?";
                return (
                  <article
                    key={row.id}
                    className={`admin-lead-card admin-lead-card--intro${open ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="admin-lead-card-toggle"
                      onClick={() => setExpandedId(open ? null : row.id)}
                    >
                      <div className="admin-lead-card-identity">
                        <span className="admin-lead-avatar" aria-hidden="true">
                          {initial}
                        </span>
                        <div className="admin-lead-card-copy">
                          <div className="admin-lead-card-title-row">
                            <strong>{name}</strong>
                            <span className="admin-lead-type-badge">
                              Request Intro
                            </span>
                          </div>
                          <span className="admin-muted">
                            {valueOrDash(row.email)} ·{" "}
                            {new Date(row.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="admin-lead-chevron">
                        {open ? "Hide" : "View"}
                      </span>
                    </button>
                    {open ? (
                      <div className="admin-lead-detail">
                        <div className="admin-lead-fields">
                          <div className="admin-lead-field">
                            <span className="admin-lead-field-label">Phone</span>
                            <span className="admin-lead-field-value">
                              {valueOrDash(row.phone_number)}
                            </span>
                          </div>
                          <div className="admin-lead-field">
                            <span className="admin-lead-field-label">
                              Timeline
                            </span>
                            <span className="admin-lead-field-value">
                              {valueOrDash(row.project_timeline)}
                            </span>
                          </div>
                        </div>
                        <div className="admin-lead-notes">
                          <span className="admin-lead-field-label">Notes</span>
                          <p>{valueOrDash(row.additional_notes)}</p>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : tab === "expert-reviews" ? (
            <div className="admin-lead-list">
              {items.map((row) => {
                const open = expandedId === row.id;
                const name = valueOrDash(row.full_name);
                const initial =
                  name !== "—" ? name.trim().charAt(0).toUpperCase() : "?";
                return (
                  <article
                    key={row.id}
                    className={`admin-lead-card admin-lead-card--review${open ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="admin-lead-card-toggle"
                      onClick={() => setExpandedId(open ? null : row.id)}
                    >
                      <div className="admin-lead-card-identity">
                        <span className="admin-lead-avatar" aria-hidden="true">
                          {initial}
                        </span>
                        <div className="admin-lead-card-copy">
                          <div className="admin-lead-card-title-row">
                            <strong>{name}</strong>
                            <span className="admin-lead-type-badge">
                              Expert Review
                            </span>
                          </div>
                          <span className="admin-muted">
                            {valueOrDash(row.email)} ·{" "}
                            {new Date(row.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className="admin-lead-chevron">
                        {open ? "Hide" : "View"}
                      </span>
                    </button>
                    {open ? (
                      <div className="admin-lead-detail">
                        <div className="admin-lead-fields">
                          <div className="admin-lead-field">
                            <span className="admin-lead-field-label">Phone</span>
                            <span className="admin-lead-field-value">
                              {valueOrDash(row.phone_number)}
                            </span>
                          </div>
                          <div className="admin-lead-field">
                            <span className="admin-lead-field-label">
                              Location
                            </span>
                            <span className="admin-lead-field-value">
                              {valueOrDash(row.project_location)}
                            </span>
                          </div>
                          <div className="admin-lead-field">
                            <span className="admin-lead-field-label">
                              Review type
                            </span>
                            <span className="admin-lead-field-value">
                              {valueOrDash(row.review_type)}
                            </span>
                          </div>
                        </div>
                        <div className="admin-lead-notes">
                          <span className="admin-lead-field-label">Notes</span>
                          <p>{valueOrDash(row.additional_notes)}</p>
                        </div>
                        {row.storage_path ? (
                          <div className="admin-lead-attachment">
                            <span className="admin-lead-field-label">
                              Attachment
                            </span>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() =>
                                void adminDownloadLeadFile(
                                  "expert-reviews",
                                  row.id,
                                  row.attachment_file_name || "attachment",
                                )
                              }
                            >
                              Download file
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-lead-list">
              {items.map((row) => {
                const open = expandedId === row.id;
                return (
                  <article
                    key={row.id}
                    className={`admin-lead-card${open ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="admin-lead-card-toggle"
                      onClick={() => setExpandedId(open ? null : row.id)}
                    >
                      <div>
                        <strong>{valueOrDash(row.original_name)}</strong>
                        <span className="admin-muted">
                          {new Date(row.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="admin-lead-chevron">
                        {open ? "Hide" : "View"}
                      </span>
                    </button>
                    {open ? (
                      <dl className="admin-info-list admin-lead-detail">
                        <div className="admin-info-row">
                          <dt>File</dt>
                          <dd>{valueOrDash(row.original_name)}</dd>
                        </div>
                        <div className="admin-info-row">
                          <dt>Assessment</dt>
                          <dd>
                            {row.assessment_id
                              ? `SV-${String(row.assessment_id).padStart(4, "0")}`
                              : "—"}
                          </dd>
                        </div>
                        <div className="admin-info-row">
                          <dt>Contact</dt>
                          <dd>
                            {[row.full_name, row.email, row.phone_number]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </dd>
                        </div>
                        <div className="admin-info-row">
                          <dt>Location</dt>
                          <dd>{valueOrDash(row.location)}</dd>
                        </div>
                        {row.storage_path ? (
                          <div className="admin-info-row">
                            <dt>Download</dt>
                            <dd>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() =>
                                  void adminDownloadLeadFile(
                                    "quote-uploads",
                                    row.id,
                                    row.original_name || "quote",
                                  )
                                }
                              >
                                Download
                              </button>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages} ({total} total)
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
