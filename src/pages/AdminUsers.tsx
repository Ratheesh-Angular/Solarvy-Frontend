import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminListVisitors, type VisitorSummary } from "../lib/adminApi";

function displayOrNA(value?: string | null): ReactNode {
  const text = value?.trim();
  if (!text) {
    return <span className="admin-muted">N/A</span>;
  }
  return text;
}

function formatLastSeen(value?: string | null) {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatLocation(visitor: VisitorSummary) {
  return [visitor.lastCity, visitor.lastRegion, visitor.lastCountry]
    .filter(Boolean)
    .join(", ");
}

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<VisitorSummary[]>([]);
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
        const data = await adminListVisitors({ q, from, to, page, limit });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load users");
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
        <h1 className="admin-page-title">Users</h1>
        <p className="admin-page-subtitle">
          Anonymous visitors with memorable labels. Open a user to review
          assessments and submissions.
        </p>
      </div>

      <div className="admin-visitors-toolbar admin-users-toolbar">
        <label className="admin-field admin-field-inline admin-date-field admin-visitors-search">
          <span className="admin-label">Search</span>
          <input
            className="admin-input admin-visitors-search-input"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search"
          />
        </label>
        <label className="admin-field admin-field-inline admin-date-field">
          <span className="admin-label">From</span>
          <input
            type="date"
            className="admin-input admin-date-input"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="admin-field admin-field-inline admin-date-field">
          <span className="admin-label">To</span>
          <input
            type="date"
            className="admin-input admin-date-input"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </label>
      </div>

      {error ? <div className="admin-panel admin-alert">{error}</div> : null}

      <div className="admin-panel admin-dashboard-panel admin-visitors-table-panel">
        {loading ? (
          <p className="admin-empty-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty-text">No users found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Last seen</th>
                  <th>Location</th>
                  <th>Assessments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">
                          {user.displayName || "user_—"}
                        </span>
                        <code className="admin-code admin-user-id">
                          {user.id.slice(0, 8)}…
                        </code>
                      </div>
                    </td>
                    <td>{displayOrNA(formatLastSeen(user.lastSeenAt))}</td>
                    <td>{displayOrNA(formatLocation(user))}</td>
                    <td>{user.assessmentCount ?? 0}</td>
                    <td>
                      <Link
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        to={`/admin/users/${user.id}`}
                      >
                        Open
                      </Link>
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
