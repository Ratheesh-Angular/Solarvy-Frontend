import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminGetChatAnalytics,
  adminGetChatSession,
  adminListChatSessions,
  type AdminChatAnalytics,
  type AdminChatSessionDetail,
  type AdminChatSessionRow,
} from "../lib/adminApi";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminChatSessions() {
  const { toast, showError, clearToast } = useFeedbackToast();
  const [analytics, setAnalytics] = useState<AdminChatAnalytics | null>(null);
  const [sessions, setSessions] = useState<AdminChatSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [modeFilter, setModeFilter] = useState<"" | "faq" | "assessment">("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminChatSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadList = async (mode: "" | "faq" | "assessment" = modeFilter) => {
    setIsLoading(true);
    clearToast();
    try {
      const [stats, list] = await Promise.all([
        adminGetChatAnalytics(),
        adminListChatSessions({
          mode: mode || undefined,
          limit: 50,
          offset: 0,
        }),
      ]);
      setAnalytics(stats);
      setSessions(list.sessions);
      setTotal(list.total);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load chat sessions.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSession = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await adminGetChatSession(id);
      setDetail(data);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load transcript.",
      );
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Chat sessions</h1>
        <p className="admin-page-subtitle">
          Review chatbot conversations, assessment-assisted drafts, and light
          engagement metrics.
        </p>
      </div>

      <div className="admin-kpi-grid" style={{ marginBottom: "1.25rem" }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Sessions</div>
          <div className="admin-kpi-value">{analytics?.totalSessions ?? "—"}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Messages</div>
          <div className="admin-kpi-value">{analytics?.totalMessages ?? "—"}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">Assessment mode</div>
          <div className="admin-kpi-value">
            {analytics?.assessmentSessions ?? "—"}
          </div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label">With draft</div>
          <div className="admin-kpi-value">
            {analytics?.sessionsWithDraft ?? "—"}
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-toolbar">
          <div className="admin-meta">{total} sessions</div>
          <div className="admin-panel-actions">
            <select
              className="admin-input"
              value={modeFilter}
              onChange={(e) => {
                const next = e.target.value as "" | "faq" | "assessment";
                setModeFilter(next);
                void loadList(next);
              }}
              aria-label="Filter by mode"
            >
              <option value="">All modes</option>
              <option value="faq">FAQ</option>
              <option value="assessment">Assessment</option>
            </select>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={isLoading}
              onClick={() => void loadList()}
            >
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="admin-muted">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="admin-muted">No chat sessions yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Updated</th>
                  <th>Mode</th>
                  <th>Messages</th>
                  <th>Draft</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.updatedAt)}</td>
                    <td>{row.mode}</td>
                    <td>{row.messageCount}</td>
                    <td>
                      {row.draftId != null ? (
                        <Link to={`/start-assessment?draft=${row.draftId}`}>
                          #{row.draftId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => void openSession(row.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="admin-panel" style={{ marginTop: "1.25rem" }}>
          <div className="admin-panel-toolbar">
            <div>
              <h2 className="admin-panel-title" style={{ margin: 0 }}>
                Transcript
              </h2>
              <div className="admin-meta">
                {detail?.mode ?? "—"} · {selectedId}
                {detail?.draftId != null
                  ? ` · draft #${detail.draftId}`
                  : ""}
              </div>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
              }}
            >
              Close
            </button>
          </div>

          {loadingDetail ? (
            <p className="admin-muted">Loading transcript...</p>
          ) : !detail ? (
            <p className="admin-muted">No transcript.</p>
          ) : (
            <div className="admin-chat-transcript">
              {detail.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`admin-chat-turn is-${msg.role}`}
                >
                  <div className="admin-chat-turn-meta">
                    {msg.role} · {formatDate(msg.createdAt)}
                  </div>
                  <div className="admin-chat-turn-body">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
