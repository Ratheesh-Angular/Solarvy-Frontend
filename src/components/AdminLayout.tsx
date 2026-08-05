import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  adminGetMe,
  clearAdminToken,
  type AdminUser,
} from "../lib/adminApi";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await adminGetMe();
        if (!cancelled) setUser(me);
      } catch {
        clearAdminToken();
        if (!cancelled) navigate("/admin/login", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-brand">
          <span className="admin-header-title">Solarvy Admin</span>
          <span className="admin-header-sub">
            {user ? `Signed in as ${user.username}` : "Loading..."}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={handleLogout}
        >
          Log out
        </button>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <p className="admin-nav-label">Workspace</p>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Excel Template
            </NavLink>
            <p className="admin-nav-label mt-3">AI Training</p>
            <NavLink
              to="/admin/bill-input"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Bill Input
            </NavLink>
          </nav>
        </aside>

        <main className="admin-content">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
