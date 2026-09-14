import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminListAssessments } from "../lib/adminApi";

export default function AdminAssessments() {
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
        const data = await adminListAssessments({ q, from, to, page, limit });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load assessments",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, from, to, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="admin-page-inner">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Assessments</h1>
        <p className="admin-page-subtitle">
          Completed assessment submissions and visitor links.
        </p>
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
            placeholder="Assessment id, visitor…"
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
          <p className="admin-empty-text">No assessments found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Created</th>
                  <th>Location</th>
                  <th>Visitor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const formData = (row.formData || {}) as Record<string, any>;
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.id}</strong>
                      </td>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                      <td>
                        {[formData.country, formData.city]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      <td>
                        {row.visitorId ? (
                          <Link to={`/admin/users/${row.visitorId}`}>
                            {String(row.visitorId).slice(0, 8)}…
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
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
