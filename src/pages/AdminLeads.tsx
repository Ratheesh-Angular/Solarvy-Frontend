import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminDownloadLeadFile,
  adminListExpertReviews,
  adminListQuoteUploads,
  adminListRequestIntros,
} from "../lib/adminApi";

type LeadTab = "request-intros" | "expert-reviews" | "quote-uploads";

export default function AdminLeads() {
  const [tab, setTab] = useState<LeadTab>("request-intros");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const loader =
          tab === "request-intros"
            ? adminListRequestIntros
            : tab === "expert-reviews"
              ? adminListExpertReviews
              : adminListQuoteUploads;
        const data = await loader({ q, from, to, page, limit });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leads");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, q, from, to, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="admin-page-inner">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Leads</h1>
        <p className="admin-page-subtitle">
          Request Intro, Expert Review, and quote upload submissions.
        </p>
      </div>

      <div className="admin-tabs">
        {(
          [
            ["request-intros", "Request Intro"],
            ["expert-reviews", "Expert Review"],
            ["quote-uploads", "Quote uploads"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`admin-tab${tab === key ? " is-active" : ""}`}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-panel admin-filters">
        <label className="admin-field">
          <span className="admin-label">Search</span>
          <input
            className="admin-input"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Name, email…"
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">From</span>
          <input
            type="date"
            className="admin-input"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">To</span>
          <input
            type="date"
            className="admin-input"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </label>
      </div>

      {error ? <div className="admin-panel admin-alert">{error}</div> : null}

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty-text">No records found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Contact</th>
                  <th>Details</th>
                  <th>Visitor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      {row.full_name || "—"}
                      <br />
                      <span className="admin-muted">{row.email || "—"}</span>
                    </td>
                    <td>
                      {tab === "request-intros"
                        ? row.project_timeline || "—"
                        : tab === "expert-reviews"
                          ? row.project_location || row.review_type || "—"
                          : (
                              <>
                                {row.original_name || "—"}
                                {row.location ? (
                                  <>
                                    <br />
                                    <span className="admin-muted">
                                      {row.location}
                                    </span>
                                  </>
                                ) : null}
                              </>
                            )}
                    </td>
                    <td>
                      {row.visitor_id ? (
                        <Link to={`/admin/users/${row.visitor_id}`}>
                          {String(row.visitor_id).slice(0, 8)}…
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {tab === "expert-reviews" && row.storage_path ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() =>
                            void adminDownloadLeadFile(
                              "expert-reviews",
                              row.id,
                              row.attachment_file_name || "attachment",
                            )
                          }
                        >
                          File
                        </button>
                      ) : null}
                      {tab === "quote-uploads" && row.storage_path ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() =>
                            void adminDownloadLeadFile(
                              "quote-uploads",
                              row.id,
                              row.original_name || "quote",
                            )
                          }
                        >
                          File
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}
