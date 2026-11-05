import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo-dark.png";
import NigeriaPhoneInput, {
  isValidNigeriaLocalPhone,
  toNigeriaE164,
} from "../components/NigeriaPhoneInput";
import SolarvyLoader from "../components/SolarvyLoader";
import FeedbackToast from "../components/FeedbackToast";
import PageSeo from "../components/PageSeo";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import {
  authWithGoogle,
  getGoogleClientId,
  requestSignupOtp,
  verifySignupOtp,
} from "../lib/authApi";
import "../css/auth-pages.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

type FieldErrors = {
  fullName?: string;
  phone?: string;
  email?: string;
  otp?: string;
};

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

function Signup() {
  const navigate = useNavigate();
  const { setSession, isAuthenticated } = useAuth();
  const { toast, showSuccess, showError, clearToast } = useFeedbackToast();

  const [fullName, setFullName] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Please wait...");
  const googleReady = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const clientId = getGoogleClientId();
    if (!clientId) return;

    const existing = document.getElementById("google-gis-script");
    if (existing) {
      googleReady.current = true;
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleReady.current = true;
    };
    document.head.appendChild(script);
  }, []);

  const validateForm = (requireEmail: boolean): FieldErrors => {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = "Please enter your full name.";
    if (!phoneLocal.trim()) {
      errors.phone = "Please enter your phone number.";
    } else if (!isValidNigeriaLocalPhone(phoneLocal)) {
      errors.phone = "Enter a valid Nigeria mobile number.";
    }
    if (requireEmail) {
      if (!email.trim()) {
        errors.email = "Please enter your email address.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Please enter a valid email address.";
      }
    }
    return errors;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(true);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    setLoaderMessage("Sending verification code...");
    try {
      await requestSignupOtp({
        fullName: fullName.trim(),
        phoneE164: toNigeriaE164(phoneLocal),
        email: email.trim().toLowerCase(),
      });
      setStep("otp");
      showSuccess("We sent a verification code to your email.", "Check your inbox");
    } catch (error) {
      showError(
        error instanceof ApiError
          ? error.message
          : "Unable to send verification code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setFieldErrors({ otp: "Enter the 6-digit code from your email." });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    setLoaderMessage("Creating your account...");
    try {
      const result = await verifySignupOtp({
        email: email.trim().toLowerCase(),
        code: otp.trim(),
      });
      if (!result.data?.token || !result.data.user) {
        throw new ApiError(result.message || "Signup failed");
      }
      setSession(result.data.token, result.data.user);
      showSuccess("Your account was created successfully.", "Welcome");
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
    const errors = validateForm(false);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
          const result = await authWithGoogle({
            idToken,
            fullName: fullName.trim(),
            phoneE164: toNigeriaE164(phoneLocal),
          });
          if (!result.data?.token || !result.data.user) {
            throw new ApiError(result.message || "Google sign-in failed");
          }
          setSession(result.data.token, result.data.user);
          showSuccess("Signed in with Google.", "Welcome");
          navigate("/");
        } catch (error) {
          showError(
            error instanceof ApiError
              ? error.message
              : "Unable to continue with Google. Please try again.",
          );
        } finally {
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
        title="Sign up | SolarVy"
        description="Create your SolarVy account with email verification or Google."
        path="/signup"
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
              <h2 className="auth-title auth-title--sentence">
                Create your account with SolarVy
              </h2>

              <form onSubmit={handleRequestOtp} noValidate>
                <div className="mb-3">
                  <label htmlFor="signup-fullName" className="form-label ass-field-label">
                    Full name
                  </label>
                  <input
                    id="signup-fullName"
                    type="text"
                    className="form-control ass-field-control"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) {
                        setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                      }
                    }}
                    autoComplete="name"
                    disabled={busy}
                  />
                  {fieldErrors.fullName ? (
                    <div className="ass-field-error">{fieldErrors.fullName}</div>
                  ) : null}
                </div>

                <div className="mb-3">
                  <label htmlFor="signup-phone" className="form-label ass-field-label">
                    Phone number
                  </label>
                  <NigeriaPhoneInput
                    id="signup-phone"
                    value={phoneLocal}
                    onChange={(value) => {
                      setPhoneLocal(value);
                      if (fieldErrors.phone) {
                        setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    disabled={busy}
                    hasError={Boolean(fieldErrors.phone)}
                  />
                  {fieldErrors.phone ? (
                    <div className="ass-field-error">{fieldErrors.phone}</div>
                  ) : null}
                </div>

                <div className="mb-3">
                  <label htmlFor="signup-email" className="form-label ass-field-label">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className="form-control ass-field-control"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    autoComplete="email"
                    disabled={busy}
                  />
                  {fieldErrors.email ? (
                    <div className="ass-field-error">{fieldErrors.email}</div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="btn-primary-custom w-100 justify-content-center"
                  disabled={busy}
                >
                  Sign Up
                </button>
              </form>

              <div className="auth-divider">or</div>

              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleContinue}
                disabled={busy}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </>
          ) : (
            <>
              <h2 className="auth-title">Verify your email</h2>
              <p className="auth-subtitle">
                Enter the 6-digit code we sent to <strong>{email}</strong>.
              </p>
              <form onSubmit={handleVerifyOtp} noValidate>
                <div className="mb-3">
                  <label htmlFor="signup-otp" className="form-label ass-field-label">
                    Verification code
                  </label>
                  <input
                    id="signup-otp"
                    type="text"
                    inputMode="numeric"
                    className="form-control ass-field-control text-center"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (fieldErrors.otp) {
                        setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                      }
                    }}
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={busy}
                    placeholder="000000"
                  />
                  {fieldErrors.otp ? (
                    <div className="ass-field-error">{fieldErrors.otp}</div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  className="btn-primary-custom w-100"
                  disabled={busy}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="btn btn-link w-100 mt-2"
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                    setFieldErrors({});
                  }}
                  disabled={busy}
                >
                  Back
                </button>
              </form>
            </>
          )}

          <p className="auth-footer-link auth-footer-link--sm">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
