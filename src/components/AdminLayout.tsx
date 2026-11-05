import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  adminGetMe,
  clearAdminToken,
  type AdminUser,
} from "../lib/adminApi";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_SECTIONS,
  adminHasPageAccess,
} from "../lib/adminNav";
import PageSeo from "./PageSeo";
import logo from "../assets/images/logo-dark.png";

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

  const displayName = user
    ? user.email || user.username
    : "Loading...";

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
          <span className="admin-header-user">{displayName}</span>
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
            {ADMIN_NAV_SECTIONS.map((section, sectionIndex) => {
              const items = ADMIN_NAV_ITEMS.filter(
                (item) =>
                  item.section === section && adminHasPageAccess(user, item.key),
              );
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  <p
                    className={
                      sectionIndex === 0
                        ? "admin-nav-label"
                        : "admin-nav-label admin-nav-label-spaced"
                    }
                  >
                    {section}
                  </p>
                  {items.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `admin-nav-link${isActive ? " is-active" : ""}`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              );
            })}

            {adminHasPageAccess(user, "users-roles") && (
              <>
                <p className="admin-nav-label admin-nav-label-spaced">Admin</p>
                <NavLink
                  to="/admin/users-roles"
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? " is-active" : ""}`
                  }
                >
                  Users &amp; Roles
                </NavLink>
              </>
            )}
          </nav>
        </aside>

        <main className="admin-content">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
