import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { adminLogin, getAdminToken } from "../lib/adminApi";
import logo from "../assets/images/logo.png";
import PageSeo from "../components/PageSeo";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (getAdminToken()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearToast();

    try {
      await adminLogin(username.trim(), password);
      showSuccess("Signed in successfully.", "Welcome");
      navigate("/admin/dashboard");
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Unable to sign in.",
        "Login failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page min-vh-100 d-flex align-items-center py-5">
      <PageSeo
        title="Admin Sign In | SolarVy"
        description="Solarvy admin sign in."
        path="/admin/login"
        noindex
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">
            <div className="text-center mb-4">
              {/* <Link to="/">
                <img src={logo} alt="Solarvy" className="admin-logo mb-3" />
              </Link> */}
              <h1 className="h4 fw-bold mb-1">Admin sign in</h1>
              <p className="text-muted small mb-0">
                Manage the Solarvy Excel calculator template.
              </p>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="admin-username" className="form-label">
                      Username
                    </label>
                    <input
                      id="admin-username"
                      type="text"
                      className="form-control"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="admin-password" className="form-label">
                      Password
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      className="form-control"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-danger w-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
