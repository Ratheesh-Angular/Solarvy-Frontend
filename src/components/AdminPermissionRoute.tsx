import { Navigate, Outlet, useLocation, useOutletContext } from "react-router-dom";
import type { AdminUser } from "../lib/adminApi";
import {
  adminHasPageAccess,
  getAdminPageKeyForPath,
  getFirstAllowedAdminPath,
} from "../lib/adminNav";

type AdminOutletContext = {
  user: AdminUser | null;
};

export default function AdminPermissionRoute() {
  const { user } = useOutletContext<AdminOutletContext>();
  const location = useLocation();

  if (!user) {
    return (
      <div className="admin-page-inner">
        <p className="admin-muted">Loading...</p>
      </div>
    );
  }

  const pageKey = getAdminPageKeyForPath(location.pathname);

  // Unknown admin paths: allow (legacy/hidden routes) only for super admin.
  if (pageKey == null) {
    if (user.isSuperAdmin) {
      return <Outlet context={{ user }} />;
    }
    const fallback = getFirstAllowedAdminPath(user);
    if (fallback) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div className="admin-page-inner">
        <h1 className="admin-page-title">No access</h1>
        <p className="admin-page-subtitle">
          Your account does not have access to any admin pages. Contact the
          super admin to assign roles.
        </p>
      </div>
    );
  }

  if (!adminHasPageAccess(user, pageKey)) {
    const fallback = getFirstAllowedAdminPath(user);
    if (fallback && fallback !== location.pathname) {
      return <Navigate to={fallback} replace />;
    }
    return (
      <div className="admin-page-inner">
        <h1 className="admin-page-title">No access</h1>
        <p className="admin-page-subtitle">
          Your account does not have access to any admin pages. Contact the
          super admin to assign roles.
        </p>
      </div>
    );
  }

  return <Outlet context={{ user }} />;
}
