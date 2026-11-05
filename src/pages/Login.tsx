import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo-dark.png";
import SolarvyLoader from "../components/SolarvyLoader";
import FeedbackToast from "../components/FeedbackToast";
import PageSeo from "../components/PageSeo";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import {
  authWithGoogle,
  getGoogleClientId,
  requestLoginOtp,
  verifyLoginOtp,
} from "../lib/authApi";
import "../css/auth-pages.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
          }) => void) => void;
        };
      };
    };
  }
}

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.1 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const { setSession, isAuthenticated } = useAuth();
  const { toast, showSuccess, showError, clearToast } = useFeedbackToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [emailError, setEmailError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Please wait...");
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const clientId = getGoogleClientId();
    if (!clientId || document.getElementById("google-gis-script")) return;
    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setBusy(true);
    setLoaderMessage("Sending login code...");
    try {
      await requestLoginOtp({ email: email.trim().toLowerCase() });
      setStep("otp");
      showSuccess("We sent a login code to your email.", "Check your inbox");
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to send login code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    setOtpError("");
    setBusy(true);
    setLoaderMessage("Signing you in...");
    try {
      const result = await verifyLoginOtp({
        email: email.trim().toLowerCase(),
        code: otp.trim(),
      });
      if (!result.data?.token || !result.data.user) {
        throw new ApiError(result.message || "Login failed");
      }
      setSession(result.data.token, result.data.user);
      showSuccess("Signed in successfully.", "Welcome back");
      navigate("/");
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to verify the code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleContinue = () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      showError(
        "Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to your environment.",
        "Google unavailable",
      );
      return;
    }
    if (!window.google?.accounts?.id) {
      showError("Google sign-in is still loading. Please try again in a moment.");
      return;
    }

    setBusy(true);
    setLoaderMessage("Connecting with Google...");

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        const idToken = response?.credential;
        if (!idToken) {
          setBusy(false);
          showError("Google sign-in was cancelled.");
          return;
        }
        try {
          const result = await authWithGoogle({ idToken });
          if (!result.data?.token || !result.data.user) {
            throw new ApiError(result.message || "Google sign-in failed");
          }
          setSession(result.data.token, result.data.user);
          showSuccess("Signed in with Google.", "Welcome back");
          navigate("/");
        } catch (error) {
          const apiError = error instanceof ApiError ? error : null;
          const message =
            apiError?.message || "Unable to continue with Google.";
          if (
            apiError?.code === "PROFILE_REQUIRED" ||
            message.toLowerCase().includes("name and phone")
          ) {
            setNeedsProfile(true);
            showError(
              "Please finish signup with your name and phone number first.",
              "Complete your profile",
            );
            navigate("/signup");
          } else {
            showError(message);
          }
          setBusy(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setBusy(false);
        showError(
          "Google sign-in could not be shown. Check your Google Client ID and authorized origins.",
        );
      }
    });
  };

  return (
    <div className="auth-page">
      <PageSeo
        title="Log in | SolarVy"
        description="Log in to your SolarVy account with email or Google."
        path="/login"
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <SolarvyLoader open={busy} message={loaderMessage} />

      <div className="auth-page-inner">
        <div className="auth-card">
          <div className="auth-logo-wrap">
            <img src={logo} alt="SolarVy" className="auth-logo" />
          </div>

          {step === "form" ? (
            <>
              <h2 className="auth-title">Log in</h2>
              <p className="auth-subtitle">
                We&apos;ll email you a one-time code to sign in.
              </p>

              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleContinue}
                disabled={busy}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="auth-divider">or</div>

              <form onSubmit={handleRequestOtp} noValidate>
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label ass-field-label">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-control ass-field-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={busy}
                  />
                  {emailError ? (
                    <div className="ass-field-error">{emailError}</div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="btn-primary-custom w-100"
                  disabled={busy}
                >
                  Continue with email
                </button>
              </form>
              {needsProfile ? (
                <p className="ass-field-error text-center mt-3">
                  New Google accounts need a name and phone on the signup page.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="auth-title">Enter login code</h2>
              <p className="auth-subtitle">
                Enter the 6-digit code we sent to <strong>{email}</strong>.
              </p>
              <form onSubmit={handleVerifyOtp} noValidate>
                <div className="mb-3">
                  <label htmlFor="login-otp" className="form-label ass-field-label">
                    Login code
                  </label>
                  <input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    className="form-control ass-field-control text-center"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={busy}
                    placeholder="000000"
                  />
                  {otpError ? (
                    <div className="ass-field-error">{otpError}</div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="btn-primary-custom w-100"
                  disabled={busy}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className="btn btn-link w-100 mt-2"
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                    setOtpError("");
                  }}
                  disabled={busy}
                >
                  Back
                </button>
              </form>
            </>
          )}

          <p className="auth-footer-link">
            Don&apos;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
