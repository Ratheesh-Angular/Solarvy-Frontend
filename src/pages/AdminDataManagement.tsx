import { useCallback, useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminClearDataCategory,
  adminGetDataManagementCounts,
  type AdminUser,
  type DataClearCategory,
  type DataManagementCounts,
} from "../lib/adminApi";
import { getFirstAllowedAdminPath } from "../lib/adminNav";

type OutletContext = {
  user: AdminUser | null;
};

type CategoryCard = {
  key: DataClearCategory;
  title: string;
  description: string;
};

const CATEGORIES: CategoryCard[] = [
  {
    key: "users",
    title: "Registered users",
    description: "Deletes all user accounts and email OTPs. Linked visitors are unlinked.",
  },
  {
    key: "guests",
    title: "Guests / visitors",
    description: "Deletes visitors, sessions, and activity events.",
  },
  {
    key: "assessments",
    title: "Assessments",
    description: "Deletes submitted assessments and assessment drafts.",
  },
  {
    key: "financing",
    title: "Financing",
    description: "Deletes all financing enquiries.",
  },
  {
    key: "leads",
    title: "Leads",
    description:
      "Deletes request intros, expert reviews, contact messages, quote uploads, and their attachment files.",
  },
];

const EMPTY_COUNTS: DataManagementCounts = {
  users: 0,
  guests: 0,
  assessments: 0,
  financing: 0,
  leads: 0,
};

export default function AdminDataManagement() {
  const { user } = useOutletContext<OutletContext>();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [counts, setCounts] = useState<DataManagementCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmCategory, setConfirmCategory] =
    useState<DataClearCategory | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetDataManagementCounts();
      setCounts(data);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load counts.",
        "Load failed",
      );
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    void loadCounts();
  }, [user?.isSuperAdmin, loadCounts]);

  if (user && !user.isSuperAdmin) {
    const fallback = getFirstAllowedAdminPath(user) || "/admin/dashboard";
    return <Navigate to={fallback} replace />;
  }

  const confirmCard = CATEGORIES.find((item) => item.key === confirmCategory);
  const canConfirm = confirmText.trim() === "DELETE";

  const openConfirm = (category: DataClearCategory) => {
    clearToast();
    setConfirmCategory(category);
    setConfirmText("");
  };

  const closeConfirm = () => {
    if (clearing) return;
    setConfirmCategory(null);
    setConfirmText("");
  };

  const handleClear = async () => {
    if (!confirmCategory || !canConfirm) return;
    setClearing(true);
    clearToast();
    try {
      await adminClearDataCategory(confirmCategory);
      showSuccess(`${confirmCard?.title ?? "Data"} cleared.`);
      setConfirmCategory(null);
      setConfirmText("");
      await loadCounts();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to clear data.",
        "Clear failed",
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header">
        <h1 className="admin-page-title">Data Management</h1>
        <p className="admin-page-subtitle">
          Permanently clear stored application data. Super admin only. This
          cannot be undone.
        </p>
      </div>

      <div className="admin-data-mgmt-grid">
        {CATEGORIES.map((item) => (
          <div key={item.key} className="admin-panel admin-data-mgmt-card">
            <div className="admin-panel-header-row">
              <h2 className="admin-panel-title">{item.title}</h2>
              <span className="admin-data-mgmt-count">
                {loading ? "…" : counts[item.key].toLocaleString()}
              </span>
            </div>
            <p className="admin-panel-lead">{item.description}</p>
            <div className="admin-panel-actions">
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={loading || clearing || counts[item.key] === 0}
                onClick={() => openConfirm(item.key)}
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmCategory && confirmCard ? (
        <div
          className="admin-data-mgmt-overlay"
          role="presentation"
          onClick={closeConfirm}
        >
          <div
            className="admin-panel admin-data-mgmt-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-data-mgmt-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="admin-data-mgmt-dialog-title"
              className="admin-panel-title"
            >
              Clear {confirmCard.title}?
            </h2>
            <p className="admin-panel-lead">
              This permanently deletes {confirmCard.title.toLowerCase()} (
              {counts[confirmCategory].toLocaleString()} records). Type{" "}
              <strong>DELETE</strong> to confirm.
            </p>
            <label className="admin-field">
              <span className="admin-label">Confirmation</span>
              <input
                className="admin-input"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="DELETE"
                autoFocus
                disabled={clearing}
              />
            </label>
            <div className="admin-panel-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={closeConfirm}
                disabled={clearing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={() => void handleClear()}
                disabled={!canConfirm || clearing}
              >
                {clearing ? "Clearing…" : "Clear permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
