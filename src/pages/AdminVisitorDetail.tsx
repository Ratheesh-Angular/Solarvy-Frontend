import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminDownloadLeadFile,
  adminGetVisitorDetail,
} from "../lib/adminApi";

type TimelineItem = {
  id: number;
  eventType: string;
  path: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export default function AdminVisitorDetail() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminGetVisitorDetail(id);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load visitor");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading visitor…</p>
      </div>
    );
  }

  if (error || !detail?.visitor) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">{error || "Visitor not found"}</div>
        <Link to="/admin/visitors" className="admin-btn admin-btn-secondary">
          Back to visitors
        </Link>
      </div>
    );
  }

  const visitor = detail.visitor;
  const timeline = (detail.timeline || []) as TimelineItem[];

  return (
    <div className="admin-page-inner">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Visitor detail</h1>
          <p className="admin-page-subtitle">
            <code className="admin-code">{visitor.id}</code>
          </p>
        </div>
        <Link to="/admin/visitors" className="admin-btn admin-btn-secondary">
          Back
        </Link>
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Profile</h2>
        <dl className="admin-info-list">
          <div className="admin-info-row">
            <dt>First seen</dt>
            <dd>{new Date(visitor.firstSeenAt).toLocaleString()}</dd>
          </div>
          <div className="admin-info-row">
            <dt>Last seen</dt>
            <dd>{new Date(visitor.lastSeenAt).toLocaleString()}</dd>
          </div>
          <div className="admin-info-row">
            <dt>IP</dt>
            <dd>{visitor.lastIp || "—"}</dd>
          </div>
          <div className="admin-info-row">
            <dt>Location</dt>
            <dd>
              {[visitor.lastCity, visitor.lastRegion, visitor.lastCountry]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div className="admin-info-row">
            <dt>User agent</dt>
            <dd className="admin-ua">{visitor.lastUserAgent || "—"}</dd>
          </div>
        </dl>
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Activity timeline</h2>
        {timeline.length === 0 ? (
          <p className="admin-empty-text">No activity recorded.</p>
        ) : (
          <ol className="admin-timeline">
            {timeline.map((item) => (
              <li key={item.id}>
                <div className="admin-timeline-time">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
                <div className="admin-timeline-body">
                  <strong>{item.eventType.replace(/_/g, " ")}</strong>
                  <span>
                    {item.path || "—"}
                    {item.entityId ? ` · ${item.entityType} ${item.entityId}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Assessments</h2>
        {(detail.assessments || []).length === 0 ? (
          <p className="admin-empty-text">No assessments.</p>
        ) : (
          <ul className="admin-simple-list">
            {detail.assessments.map((a: any) => (
              <li key={a.id}>
                <strong>{a.id}</strong> · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Request Intro</h2>
        {(detail.requestIntros || []).length === 0 ? (
          <p className="admin-empty-text">None.</p>
        ) : (
          <ul className="admin-simple-list">
            {detail.requestIntros.map((row: any) => (
              <li key={row.id}>
                {row.full_name} · {row.email} ·{" "}
                {new Date(row.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Expert Reviews</h2>
        {(detail.expertReviews || []).length === 0 ? (
          <p className="admin-empty-text">None.</p>
        ) : (
          <ul className="admin-simple-list">
            {detail.expertReviews.map((row: any) => (
              <li key={row.id}>
                {row.full_name} · {row.email} · {row.project_location}
                {row.storage_path ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
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
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-panel">
        <h2 className="admin-panel-title">Quote uploads</h2>
        {(detail.quoteUploads || []).length === 0 ? (
          <p className="admin-empty-text">None.</p>
        ) : (
          <ul className="admin-simple-list">
            {detail.quoteUploads.map((row: any) => (
              <li key={row.id}>
                {row.original_name} · {new Date(row.created_at).toLocaleString()}
                {row.storage_path ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
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
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
