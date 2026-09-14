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
      <div className="admin-page admin-checking">
        <p>Checking session...</p>
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
