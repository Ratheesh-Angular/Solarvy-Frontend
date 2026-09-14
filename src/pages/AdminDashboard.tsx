import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import SolarvyLoader from "../components/SolarvyLoader";
import {
  adminGetAnalyticsOverview,
  adminGetRecentActivity,
  type ActivityItem,
  type AnalyticsOverview,
} from "../lib/adminApi";

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatEventLabel(type: string) {
  return type.replace(/_/g, " ");
}

function formatDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const chartTooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: 13,
};

export default function AdminDashboard() {
  const initial = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, recentItems] = await Promise.all([
          adminGetAnalyticsOverview({ from, to }),
          adminGetRecentActivity(5),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setRecent(recentItems);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const kpis = overview?.kpis;
  const visitorsChart =
    overview?.charts.visitorsByDay.map((row) => ({
      day: formatDay(row.day),
      visitors: row.count,
    })) ?? [];
  const submissionsChart =
    overview?.charts.submissionsByDay.map((row) => ({
      day: formatDay(row.day),
      assessments: row.assessments,
      requestIntros: row.requestIntros,
      expertReviews: row.expertReviews,
      quoteUploads: row.quoteUploads,
    })) ?? [];

  const recentPreview = recent.slice(0, 5);

  return (
    <div className="admin-page-inner">
      <SolarvyLoader open={loading} message="Loading dashboard..." />

      <div className="admin-page-header admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Visitor trends, assessment usage, and recent leads.
          </p>
        </div>
        <div className="admin-date-filters">
          <label className="admin-field admin-field-inline admin-date-field">
            <span className="admin-label">From</span>
            <input
              type="date"
              className="admin-input admin-date-input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="admin-field admin-field-inline admin-date-field">
            <span className="admin-label">To</span>
            <input
              type="date"
              className="admin-input admin-date-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="admin-panel admin-alert">{error}</div>
      ) : null}

      {!loading ? (
        <>
          <div className="admin-kpi-grid">
            {[
              { label: "Unique visitors", value: kpis?.uniqueVisitors },
              { label: "Total sessions", value: kpis?.totalSessions },
              { label: "Assessment starts", value: kpis?.assessmentStarts },
              { label: "Completed assessments", value: kpis?.completedAssessments },
              { label: "Request Intro", value: kpis?.requestIntros },
              { label: "Expert Review", value: kpis?.expertReviews },
              { label: "Quote uploads", value: kpis?.quoteUploads },
              {
                label: "Visitor → assessment",
                value:
                  kpis != null ? `${kpis.visitorToAssessmentRate}%` : undefined,
              },
            ].map((card) => (
              <div key={card.label} className="admin-kpi-card">
                <p className="admin-kpi-label">{card.label}</p>
                <p className="admin-kpi-value">{card.value ?? "—"}</p>
              </div>
            ))}
          </div>

          <div className="admin-chart-grid">
            <div className="admin-panel admin-dashboard-panel">
              <div className="admin-panel-header-row">
                <h2 className="admin-panel-title">Visitors by day</h2>
              </div>
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={visitorsChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#174c90"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#174c90" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-panel admin-dashboard-panel">
              <div className="admin-panel-header-row">
                <h2 className="admin-panel-title">Submissions by day</h2>
              </div>
              <div className="admin-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={submissionsChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="assessments" fill="#174c90" name="Assessments" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="requestIntros" fill="#123a70" name="Request Intro" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expertReviews" fill="#0f766e" name="Expert Review" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="quoteUploads" fill="#b45309" name="Quote uploads" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="admin-panel admin-dashboard-panel">
            <div className="admin-panel-header-row">
              <h2 className="admin-panel-title">Recent activity</h2>
              <Link to="/admin/users" className="admin-btn admin-btn-secondary admin-btn-sm">
                View users
              </Link>
            </div>
            {recentPreview.length === 0 ? (
              <p className="admin-empty-text">No recent activity yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Event</th>
                      <th>Visitor</th>
                      <th>Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPreview.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                        <td>
                          <span className="admin-event-pill">
                            {formatEventLabel(item.eventType)}
                          </span>
                        </td>
                        <td>
                          {item.visitorId ? (
                            <Link
                              to={`/admin/users/${item.visitorId}`}
                              className="admin-table-link"
                            >
                              {item.visitorId.slice(0, 8)}…
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="admin-table-path">{item.path || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
