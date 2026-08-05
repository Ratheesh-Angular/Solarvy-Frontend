import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { adminGetMe, getAdminToken, clearAdminToken } from "../lib/adminApi";

export default function AdminRoute() {
  const token = getAdminToken();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">(
    token ? "checking" : "denied",
  );

  useEffect(() => {
    if (!token) {
      setStatus("denied");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await adminGetMe();
        if (!cancelled) setStatus("ok");
      } catch {
        clearAdminToken();
        if (!cancelled) setStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "checking") {
    return (
      <div className="admin-page d-flex align-items-center justify-content-center min-vh-100">
        <p className="text-muted mb-0">Checking session...</p>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
