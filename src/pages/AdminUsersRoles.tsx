import { useEffect, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminCreateStaffUser,
  adminDeleteStaffUser,
  adminListStaffUsers,
  adminUpdateStaffUser,
  type AdminUser,
  type StaffAdminUser,
} from "../lib/adminApi";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_SECTIONS,
  getFirstAllowedAdminPath,
  type AdminNavSection,
  type AdminPageKey,
} from "../lib/adminNav";

type FormState = {
  email: string;
  password: string;
  permissions: AdminPageKey[];
};

type TabKey = "form" | "list";

const emptyForm = (): FormState => ({
  email: "",
  password: "",
  permissions: [],
});

type OutletContext = {
  user: AdminUser | null;
};

const TOTAL_PAGES = ADMIN_NAV_ITEMS.length;

function permissionLabels(permissions: string[]) {
  return ADMIN_NAV_ITEMS.filter((item) =>
    permissions.includes(item.key),
  ).map((item) => item.label);
}

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function emailInitial(email: string | null | undefined) {
  const ch = (email ?? "").trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function AccessChips({ permissions }: { permissions: string[] }) {
  const labels = permissionLabels(permissions);
  if (!labels.length) {
    return <span className="admin-users-roles-no-access">No access</span>;
  }
  if (labels.length <= 4) {
    return (
      <div className="admin-users-roles-chips">
        {labels.map((label) => (
          <span key={label} className="admin-users-roles-chip">
            {label}
          </span>
        ))}
      </div>
    );
  }
  const visible = labels.slice(0, 3);
  const more = labels.length - 3;
  return (
    <div className="admin-users-roles-chips">
      {visible.map((label) => (
        <span key={label} className="admin-users-roles-chip">
          {label}
        </span>
      ))}
      <span className="admin-users-roles-chip admin-users-roles-chip-more">
        +{more} more
      </span>
    </div>
  );
}

export default function AdminUsersRoles() {
  const { user } = useOutletContext<OutletContext>();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [staff, setStaff] = useState<StaffAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("form");

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const data = await adminListStaffUsers();
      setStaff(data);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to load users.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isSuperAdmin) return;
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isSuperAdmin]);

  if (user && !user.isSuperAdmin) {
    return (
      <Navigate
        to={getFirstAllowedAdminPath(user) ?? "/admin/login"}
        replace
      />
    );
  }

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setTab("form");
  };

  const startEdit = (row: StaffAdminUser) => {
    setEditingId(row.id);
    setForm({
      email: row.email ?? "",
      password: "",
      permissions: ADMIN_NAV_ITEMS.map((item) => item.key).filter((key) =>
        row.permissions.includes(key),
      ),
    });
    setTab("form");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setTab("list");
  };

  const togglePermission = (key: AdminPageKey) => {
    setForm((prev) => {
      const has = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((item) => item !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const toggleAllPermissions = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      permissions: checked ? ADMIN_NAV_ITEMS.map((item) => item.key) : [],
    }));
  };

  const toggleSectionPermissions = (
    section: AdminNavSection,
    checked: boolean,
  ) => {
    const sectionKeys = ADMIN_NAV_ITEMS.filter(
      (item) => item.section === section,
    ).map((item) => item.key);

    setForm((prev) => {
      if (checked) {
        const next = new Set([...prev.permissions, ...sectionKeys]);
        return {
          ...prev,
          permissions: ADMIN_NAV_ITEMS.map((item) => item.key).filter((key) =>
            next.has(key),
          ),
        };
      }
      return {
        ...prev,
        permissions: prev.permissions.filter(
          (key) => !sectionKeys.includes(key),
        ),
      };
    });
  };

  const handleSave = async () => {
    const email = form.email.trim();
    if (!email) {
      showError("Email is required.");
      return;
    }
    if (editingId == null && form.password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (editingId != null && form.password && form.password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }

    setIsSaving(true);
    clearToast();
    try {
      if (editingId == null) {
        await adminCreateStaffUser({
          email,
          password: form.password,
          permissions: form.permissions,
        });
        showSuccess("User created.", "Saved");
      } else {
        await adminUpdateStaffUser(editingId, {
          email,
          password: form.password || undefined,
          permissions: form.permissions,
        });
        showSuccess("User updated.", "Saved");
      }
      setEditingId(null);
      setForm(emptyForm());
      setTab("list");
      await loadStaff();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to save user.",
        "Save failed",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: StaffAdminUser) => {
    const ok = window.confirm(
      `Delete staff account “${row.email}”? This cannot be undone.`,
    );
    if (!ok) return;

    clearToast();
    try {
      await adminDeleteStaffUser(row.id);
      if (editingId === row.id) {
        setEditingId(null);
        setForm(emptyForm());
      }
      showSuccess("User deleted.");
      await loadStaff();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to delete user.",
        "Delete failed",
      );
    }
  };

  const allSelected =
    form.permissions.length === TOTAL_PAGES && TOTAL_PAGES > 0;

  const query = search.trim().toLowerCase();
  const filteredStaff = query
    ? staff.filter((row) =>
        (row.email ?? "").toLowerCase().includes(query),
      )
    : staff;

  const isEditing = editingId != null;
  const editingRow = isEditing
    ? staff.find((row) => row.id === editingId)
    : null;

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Users &amp; Roles</h1>
          <p className="admin-page-subtitle">
            Manage staff accounts and which admin pages they can open.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={isSaving}
          onClick={startCreate}
        >
          Add staff
        </button>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tab === "form" ? " is-active" : ""}`}
          onClick={() => setTab("form")}
        >
          {isEditing ? "Edit staff" : "Form"}
        </button>
        <button
          type="button"
          className={`admin-tab${tab === "list" ? " is-active" : ""}`}
          onClick={() => setTab("list")}
        >
          Staff list
        </button>
      </div>

      <div className="admin-users-roles">
        {tab === "form" ? (
          <div
            className="admin-panel admin-users-roles-form"
            aria-label={isEditing ? "Edit staff" : "Add staff"}
          >
            <div className="admin-panel-toolbar">
              <div className="admin-users-roles-form-title">
                {isEditing
                  ? `Edit · ${editingRow?.email ?? (form.email || "staff")}`
                  : "Add staff"}
              </div>
              {isEditing && (
                <div className="admin-panel-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    disabled={isSaving}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="admin-users-roles-fields">
              <div className="admin-users-roles-credentials">
                <label className="admin-users-roles-field">
                  <span>Email</span>
                  <input
                    type="email"
                    className="admin-input"
                    autoComplete="off"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    disabled={isSaving}
                    required
                  />
                </label>
                <label className="admin-users-roles-field">
                  <span>Password</span>
                  <input
                    type="password"
                    className="admin-input"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                    required={editingId == null}
                  />
                  <span className="admin-users-roles-helper">
                    {isEditing
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"}
                  </span>
                </label>
              </div>

              <div className="admin-users-roles-access">
                <div className="admin-users-roles-access-head">
                  <div className="admin-users-roles-access-title-wrap">
                    <span className="admin-users-roles-access-title">
                      Page access
                    </span>
                    <span className="admin-meta">
                      {form.permissions.length} of {TOTAL_PAGES} pages
                    </span>
                  </div>
                  <label className="admin-users-roles-check admin-users-roles-check-inline">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleAllPermissions(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>Select all pages</span>
                  </label>
                </div>

                <div className="admin-users-roles-sections">
                  {ADMIN_NAV_SECTIONS.map((section) => {
                    const items = ADMIN_NAV_ITEMS.filter(
                      (item) => item.section === section,
                    );
                    const sectionSelected = items.every((item) =>
                      form.permissions.includes(item.key),
                    );
                    const sectionPartial =
                      !sectionSelected &&
                      items.some((item) =>
                        form.permissions.includes(item.key),
                      );

                    return (
                      <div
                        key={section}
                        className="admin-users-roles-section"
                      >
                        <div className="admin-users-roles-section-head">
                          <span className="admin-users-roles-section-title">
                            {section}
                          </span>
                          <label className="admin-users-roles-check admin-users-roles-check-inline">
                            <input
                              type="checkbox"
                              checked={sectionSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = sectionPartial;
                              }}
                              onChange={(e) =>
                                toggleSectionPermissions(
                                  section,
                                  e.target.checked,
                                )
                              }
                              disabled={isSaving}
                            />
                            <span>Select all</span>
                          </label>
                        </div>
                        <div className="admin-users-roles-perm-list">
                          {items.map((item) => {
                            const checked = form.permissions.includes(
                              item.key,
                            );
                            return (
                              <label
                                key={item.key}
                                className={`admin-users-roles-perm${checked ? " is-selected" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(item.key)}
                                  disabled={isSaving}
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-users-roles-actions">
                {isEditing && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    disabled={isSaving}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  disabled={isSaving}
                  onClick={handleSave}
                >
                  {isSaving
                    ? "Saving…"
                    : isEditing
                      ? "Save changes"
                      : "Create staff"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="admin-panel admin-users-roles-list">
            <div className="admin-panel-toolbar">
              <div className="admin-meta">
                {isLoading ? "Loading…" : `${staff.length} staff`}
              </div>
              <div className="admin-users-roles-list-tools">
                <input
                  type="search"
                  className="admin-input admin-users-roles-search"
                  placeholder="Search by email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={isLoading}
                  aria-label="Search staff by email"
                />
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  disabled={isLoading}
                  onClick={loadStaff}
                >
                  Reload
                </button>
              </div>
            </div>

            {isLoading ? (
              <p className="admin-muted">Loading users…</p>
            ) : staff.length === 0 ? (
              <div className="admin-users-roles-empty">
                <p className="admin-muted">No staff accounts yet.</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={startCreate}
                >
                  Add staff
                </button>
              </div>
            ) : filteredStaff.length === 0 ? (
              <p className="admin-muted">No staff match that email.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-users-roles-table">
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Access</th>
                      <th>Created</th>
                      <th className="admin-users-roles-actions-col">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          editingId === row.id
                            ? "admin-users-roles-row is-editing"
                            : "admin-users-roles-row"
                        }
                      >
                        <td>
                          <div className="admin-users-roles-staff">
                            <span
                              className="admin-users-roles-avatar"
                              aria-hidden="true"
                            >
                              {emailInitial(row.email)}
                            </span>
                            <span className="admin-users-roles-email">
                              {row.email}
                            </span>
                          </div>
                        </td>
                        <td>
                          <AccessChips permissions={row.permissions} />
                        </td>
                        <td className="admin-users-roles-created">
                          {row.createdAt
                            ? formatCreatedAt(row.createdAt)
                            : "—"}
                        </td>
                        <td className="admin-users-roles-actions-col">
                          <div className="admin-panel-actions admin-users-roles-row-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary"
                              disabled={isSaving}
                              onClick={() => startEdit(row)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={isSaving}
                              onClick={() => handleDelete(row)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
