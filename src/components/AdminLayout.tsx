import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  adminGetMe,
  clearAdminToken,
  type AdminUser,
} from "../lib/adminApi";
import PageSeo from "./PageSeo";
import logo from "../assets/images/logo.png";

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
      <PageSeo
        title="Admin | SolarVy"
        description="Solarvy admin console."
        path="/admin"
        noindex
      />
      <header className="admin-header">
        <Link to="/admin/dashboard" className="admin-header-brand">
          <img src={logo} alt="Solarvy" className="admin-header-logo" />
          <span className="admin-header-badge">Admin</span>
        </Link>
        <div className="admin-header-actions">
          <span className="admin-header-user">
            {user ? user.username : "Loading..."}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <p className="admin-nav-label">Workspace</p>
            <NavLink
              to="/admin/dashboard"
              end
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Users
            </NavLink>
            <NavLink
              to="/admin/assessments"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Assessments
            </NavLink>
            <NavLink
              to="/admin/leads"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Leads
            </NavLink>
            <NavLink
              to="/admin/excel-template"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Excel Template
            </NavLink>
            <p className="admin-nav-label admin-nav-label-spaced">AI Training</p>
            <NavLink
              to="/admin/bill-input"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Bill Input
            </NavLink>
            <NavLink
              to="/admin/recommendations"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Recommendations
            </NavLink>
            {/* <NavLink
              to="/admin/chatbot-prompt"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Chatbot Prompt
            </NavLink>
            <NavLink
              to="/admin/faqs"
              className={({ isActive }) =>
                `admin-nav-link${isActive ? " is-active" : ""}`
              }
            >
              Chatbot FAQs
            </NavLink> */}
          </nav>
        </aside>

        <main className="admin-content">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
