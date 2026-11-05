import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  adminListFinancingEnquiries,
  financingStatusLabel,
  type AdminFinancingEnquiry,
} from "../lib/adminApi";
import { formatNaira } from "../lib/financing";

function valueOrDash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

export default function AdminFinancing() {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminFinancingEnquiry[]>([]);
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
        const data = await adminListFinancingEnquiries({
          q,
          from,
          to,
          page,
          limit,
        });
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load financing",
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
        <h1 className="admin-page-title">Financing</h1>
        <p className="admin-page-subtitle">
          Financing enquiries and visitor links.
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
            placeholder="Reference, partner, visitor…"
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

      <div className="admin-panel">
        {loading ? (
          <p className="admin-empty-text">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty-text">No financing enquiries found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-fin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Submitted</th>
                  <th>Partner / route</th>
                  <th>Amount requested</th>
                  <th>Status</th>
                  <th>Visitor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{valueOrDash(row.reference)}</strong>
                      {row.assessmentRef ? (
                        <span className="admin-fin-sub">
                          {String(row.assessmentRef)}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <strong>{valueOrDash(row.partnerName)}</strong>
                      <span className="admin-fin-sub">
                        {valueOrDash(row.routeLabel)}
                      </span>
                    </td>
                    <td>{formatNaira(row.amountToFinance) || "—"}</td>
                    <td>
                      <span
                        className={`admin-fin-status admin-fin-status--${String(row.status)}`}
                      >
                        {financingStatusLabel(row.status)}
                      </span>
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
                    <td>
                      {row.visitorId ? (
                        <Link
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          to={`/admin/users/${row.visitorId}/financing/${row.id}`}
                        >
                          Review
                        </Link>
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
