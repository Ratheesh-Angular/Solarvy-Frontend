import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { adminLogin, getAdminToken } from "../lib/adminApi";
import logo from "../assets/images/logo-dark.png";
import PageSeo from "../components/PageSeo";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="admin-page admin-login">
      <PageSeo
        title="Admin Sign In | SolarVy"
        description="Solarvy admin sign in."
        path="/admin/login"
        noindex
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <div className="admin-login-card">
        <div className="admin-panel admin-login-panel">
          <div className="admin-login-brand">
            <Link to="/">
              <img src={logo} alt="Solarvy" className="admin-login-logo" />
            </Link>
            <h1 className="admin-login-title">Admin sign in</h1>
            <p className="admin-login-subtitle">
              Sign in to the Solarvy admin console.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="admin-username" className="admin-label">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                className="admin-input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="admin-password" className="admin-label">
                Password
              </label>
              <div className="admin-password-field">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  className="admin-input"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn-primary admin-btn-block"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
