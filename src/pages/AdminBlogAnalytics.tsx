import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SolarvyLoader from "../components/SolarvyLoader";
import {
  adminGetBlogAnalyticsOverview,
  adminGetBlogPostAnalytics,
  adminGetPopularBlogs,
  type BlogAnalyticsOverview,
  type BlogDailyPoint,
  type BlogPostAnalytics,
  type PopularBlogRow,
} from "../lib/adminApi";

function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeForDays(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: isoDay(from), to: isoDay(to) };
}

function formatDay(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function truncate(value: string, max = 28) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return <span className="admin-kpi-delta">No change vs previous period</span>;
  }
  if (previous === 0) {
    return <span className="admin-kpi-delta is-up">New activity vs previous period</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone = pct > 0 ? " is-up" : pct < 0 ? " is-down" : "";
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={`admin-kpi-delta${tone}`}>
      {sign}
      {pct}% vs previous period
    </span>
  );
}

const chartTooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: 13,
};

function TrendChart({ data }: { data: BlogDailyPoint[] }) {
  const rows = data.map((r) => ({
    day: formatDay(r.day),
    views: r.views,
    unique: r.uniqueVisitors,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
        <Line
          type="monotone"
          dataKey="views"
          name="Views"
          stroke="#174c90"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#174c90" }}
        />
        <Line
          type="monotone"
          dataKey="unique"
          name="Unique visitors"
          stroke="#f5a623"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#f5a623" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function AdminBlogAnalytics() {
  const initial = useMemo(() => rangeForDays(30), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = Number(searchParams.get("post")) || null;

  const rangeKey = `${from}|${to}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    overview: BlogAnalyticsOverview | null;
    popular: PopularBlogRow[];
    error: string;
  } | null>(null);

  const detailKey = selectedId ? `${selectedId}|${rangeKey}` : "";
  const [loadedDetail, setLoadedDetail] = useState<{
    key: string;
    detail: BlogPostAnalytics | null;
  } | null>(null);

  const loading = loaded?.key !== rangeKey;
  const overview = loaded?.key === rangeKey ? loaded.overview : null;
  const popular = useMemo(
    () => (loaded?.key === rangeKey ? loaded.popular : []),
    [loaded, rangeKey],
  );
  const error = loaded?.key === rangeKey ? loaded.error : "";
  const detailLoading = Boolean(selectedId) && loadedDetail?.key !== detailKey;
  const detail = selectedId && loadedDetail?.key === detailKey ? loadedDetail.detail : null;

  useEffect(() => {
    let cancelled = false;
    const key = `${from}|${to}`;
    Promise.all([
      adminGetBlogAnalyticsOverview({ from, to }),
      adminGetPopularBlogs({ from, to, limit: 10 }),
    ])
      .then(([ov, pop]) => {
        if (!cancelled) setLoaded({ key, overview: ov, popular: pop, error: "" });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({
            key,
            overview: null,
            popular: [],
            error: err instanceof Error ? err.message : "Failed to load blog analytics",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const key = `${selectedId}|${from}|${to}`;
    adminGetBlogPostAnalytics(selectedId, { from, to })
      .then((d) => {
        if (!cancelled) setLoadedDetail({ key, detail: d });
      })
      .catch(() => {
        if (!cancelled) setLoadedDetail({ key, detail: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, from, to]);

  const selectPost = (id: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("post", String(id));
    else params.delete("post");
    setSearchParams(params, { replace: true });
  };

  const applyPreset = (days: number) => {
    const r = rangeForDays(days);
    setFrom(r.from);
    setTo(r.to);
  };

  const kpis = overview?.kpis;
  const maxViews = popular[0]?.views || 1;
  const barData = popular.map((p) => ({
    name: truncate(p.title),
    views: p.views,
    unique: p.uniqueVisitors,
  }));
  const maxReferrer = detail?.referrers[0]?.views || 1;

  return (
    <div className="admin-page-inner">
      <SolarvyLoader open={loading} message="Loading blog analytics..." />

      <div className="admin-page-header admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Blog Analytics</h1>
          <p className="admin-page-subtitle">
            Article views, unique visitors, and your most popular content.
          </p>
        </div>
        <div className="admin-date-filters">
          {PRESETS.map((p) => {
            const r = rangeForDays(p.days);
            const active = r.from === from && r.to === to;
            return (
              <button
                key={p.days}
                type="button"
                className={`admin-btn admin-btn-ghost admin-btn-sm admin-blog-preset${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => applyPreset(p.days)}
              >
                {p.label}
              </button>
            );
          })}
          <label className="admin-field admin-field-inline admin-date-field">
            <span className="admin-label">From</span>
            <input
              type="date"
              className="admin-input admin-date-input"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="admin-field admin-field-inline admin-date-field">
            <span className="admin-label">To</span>
            <input
              type="date"
              className="admin-input admin-date-input"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      </div>

      {error ? <div className="admin-panel admin-alert">{error}</div> : null}

      {!loading && overview ? (
        <>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card">
              <p className="admin-kpi-label">Total views</p>
              <p className="admin-kpi-value">{kpis?.totalViews ?? 0}</p>
              <Delta current={kpis?.totalViews ?? 0} previous={kpis?.previousViews ?? 0} />
            </div>
            <div className="admin-kpi-card">
              <p className="admin-kpi-label">Unique visitors</p>
              <p className="admin-kpi-value">{kpis?.uniqueVisitors ?? 0}</p>
              <Delta
                current={kpis?.uniqueVisitors ?? 0}
                previous={kpis?.previousUniqueVisitors ?? 0}
              />
            </div>
            <div className="admin-kpi-card">
              <p className="admin-kpi-label">Published posts</p>
              <p className="admin-kpi-value">{kpis?.publishedPosts ?? 0}</p>
              <span className="admin-kpi-delta">
                {kpis?.draftPosts ?? 0} draft{kpis?.draftPosts === 1 ? "" : "s"} ·{" "}
                {kpis?.postsViewed ?? 0} viewed in range
              </span>
            </div>
            <div className="admin-kpi-card">
              <p className="admin-kpi-label">Avg views per post</p>
              <p className="admin-kpi-value">{kpis?.avgViewsPerPost ?? 0}</p>
              <span className="admin-kpi-delta">Across published posts</span>
            </div>
          </div>

          <div className="admin-panel admin-dashboard-panel">
            <div className="admin-panel-header-row">
              <h2 className="admin-panel-title">Views vs unique visitors</h2>
            </div>
            <div className="admin-chart">
              <TrendChart data={overview.daily} />
            </div>
          </div>

          <div className="admin-chart-grid" style={{ marginTop: 16 }}>
            <div className="admin-panel admin-dashboard-panel">
              <div className="admin-panel-header-row">
                <h2 className="admin-panel-title">Popular blogs</h2>
                <Link to="/admin/blogs" className="admin-btn admin-btn-secondary admin-btn-sm">
                  Manage posts
                </Link>
              </div>
              {popular.length === 0 ? (
                <p className="admin-empty-text">No article views in this date range yet.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Article</th>
                        <th className="text-end">Views</th>
                        <th className="text-end">Unique</th>
                        <th>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {popular.map((p, i) => (
                        <tr key={p.id} className={selectedId === p.id ? "is-selected" : ""}>
                          <td>
                            <span className="admin-blog-rank">{i + 1}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="admin-blog-row-button"
                              onClick={() => selectPost(selectedId === p.id ? null : p.id)}
                            >
                              {p.title}
                            </button>
                            <div className="admin-table-path">
                              {p.category || "Uncategorized"} · last view {formatDateTime(p.lastViewedAt)}
                            </div>
                          </td>
                          <td className="text-end">{p.views}</td>
                          <td className="text-end">{p.uniqueVisitors}</td>
                          <td>
                            <div className="admin-blog-bar">
                              <span style={{ width: `${Math.max(4, (p.views / maxViews) * 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="admin-panel admin-dashboard-panel">
              <div className="admin-panel-header-row">
                <h2 className="admin-panel-title">Top articles by views</h2>
              </div>
              <div className="admin-chart">
                {barData.length === 0 ? (
                  <p className="admin-empty-text">Nothing to chart yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(260, barData.length * 38)}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={170}
                        tick={{ fontSize: 12, fill: "#0f172a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                      <Bar dataKey="views" name="Views" fill="#174c90" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="unique" name="Unique visitors" fill="#f5a623" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {selectedId ? (
            <div className="admin-panel admin-dashboard-panel admin-blog-drilldown">
              <div className="admin-panel-header-row">
                <h2 className="admin-panel-title">
                  {detail ? detail.blog.title : detailLoading ? "Loading article…" : "Article not found"}
                </h2>
                <div className="admin-panel-actions">
                  {detail ? (
                    <>
                      <Link
                        to={`/admin/blogs/${detail.blog.id}`}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                      >
                        Edit
                      </Link>
                      {detail.blog.status === "published" ? (
                        <a
                          href={`/blog/${detail.blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                        >
                          View
                        </a>
                      ) : null}
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => selectPost(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
              {detail ? (
                <>
                  <dl className="admin-blog-drilldown-kpis">
                    <div>
                      <dt>Views (range)</dt>
                      <dd>{detail.kpis.views}</dd>
                    </div>
                    <div>
                      <dt>Unique (range)</dt>
                      <dd>{detail.kpis.uniqueVisitors}</dd>
                    </div>
                    <div>
                      <dt>All-time views</dt>
                      <dd>{detail.kpis.allTimeViews}</dd>
                    </div>
                    <div>
                      <dt>All-time unique</dt>
                      <dd>{detail.kpis.allTimeUniqueVisitors}</dd>
                    </div>
                  </dl>
                  <div className="admin-blog-drilldown-body">
                    <div className="admin-chart">
                      <TrendChart data={detail.daily} />
                    </div>
                    <div>
                      <h3 className="admin-panel-title" style={{ padding: "12px 10px 0", fontSize: 14 }}>
                        Top traffic sources
                      </h3>
                      {detail.referrers.length === 0 ? (
                        <p className="admin-empty-text">No views in this range.</p>
                      ) : (
                        <ul className="admin-blog-referrers">
                          {detail.referrers.map((r) => (
                            <li key={r.source}>
                              <span>{r.source}</span>
                              <strong>{r.views}</strong>
                              <div className="admin-blog-bar">
                                <span style={{ width: `${Math.max(4, (r.views / maxReferrer) * 100)}%` }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <p className="admin-blog-footnote">
            Views are counted once per visitor per article every 30 minutes, and
            known bots and link-preview crawlers are excluded. Unique visitors are
            distinct browsers — a person who clears their browser data or switches
            devices is counted again.
          </p>
        </>
      ) : null}
    </div>
  );
}
