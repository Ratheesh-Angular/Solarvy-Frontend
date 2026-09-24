import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import sunone from "../assets/images/icon/sun.svg";
import sunthree from "../assets/images/icon/sun1.svg";
import { CheckCircle2 } from "lucide-react";
import { apiPost, ApiError } from "../lib/api";
import { getAssessment } from "../lib/assessmentApi";
import PageSeo from "../components/PageSeo";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import type {
  AssessmentFormData,
  AssessmentResults,
} from "../types/assessment";

type InstallerMatch = NonNullable<
  AssessmentResults["installerMatches"]
>[number];

type RequestIntroLocationState = {
  installer?: InstallerMatch;
};

type ProjectSummaryItem = {
  label: string;
  value: string;
};

const FALLBACK_INSTALLER = {
  installerName: "PrimeVolt Energy",
  matchPct: 82,
  coverage: "Lagos",
  bestSuitedFor: "SME fit",
  matchTier: "Solar + battery",
} as const;

const DEFAULT_PROJECT_SUMMARY: ProjectSummaryItem[] = [
  { label: "Location", value: "Lagos" },
  { label: "Project type", value: "Small business" },
  { label: "Estimated size", value: "15–25 kWp" },
  { label: "Budget range", value: "₦18m–₦24m" },
];

const EMPTY_PROJECT_SUMMARY: ProjectSummaryItem[] = [
  { label: "Location", value: "—" },
  { label: "Project type", value: "—" },
  { label: "Estimated size", value: "—" },
  { label: "Budget range", value: "—" },
];

function formatNairaShort(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) >= 1_000_000) {
    const millions = n / 1_000_000;
    const rounded =
      Math.abs(millions) >= 10
        ? Math.round(millions)
        : Math.round(millions * 10) / 10;
    return `₦${rounded}m`;
  }
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function formatKwp(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-NG")} kWp`;
}

function buildProjectSummary(
  results: AssessmentResults | null | undefined,
  formData?: AssessmentFormData | null,
  options?: { useDemoDefaults?: boolean },
): ProjectSummaryItem[] {
  const useDemoDefaults = options?.useDemoDefaults !== false;
  const fallback = useDemoDefaults
    ? DEFAULT_PROJECT_SUMMARY
    : EMPTY_PROJECT_SUMMARY;

  if (!results && !formData) return [...fallback];

  const location =
    results?.city?.trim() ||
    formData?.city?.trim() ||
    results?.country?.trim() ||
    formData?.country?.trim() ||
    null;
  const propertyType =
    results?.propertyType?.trim() || formData?.propertyType?.trim() || null;
  const estimatedSize = formatKwp(results?.recommendedSolarKwp);
  const budgetRange = formatNairaShort(results?.estimatedSystemCost);

  return [
    {
      label: "Location",
      value: location || fallback[0].value,
    },
    {
      label: "Project type",
      value: propertyType || fallback[1].value,
    },
    {
      label: "Estimated size",
      value: estimatedSize || fallback[2].value,
    },
    {
      label: "Budget range",
      value: budgetRange || fallback[3].value,
    },
  ];
}

function RequestIntro() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment")?.trim() || "";
  const [scrolled, setScrolled] = useState(false);
  const { toast, showSuccess, clearToast } = useFeedbackToast();
  const [projectSummary, setProjectSummary] = useState<ProjectSummaryItem[]>(
    () => [...DEFAULT_PROJECT_SUMMARY],
  );

  const installerFromState = (
    location.state as RequestIntroLocationState | null
  )?.installer;
  const installerName =
    installerFromState?.installerName?.trim() ||
    FALLBACK_INSTALLER.installerName;
  const matchPct = installerFromState
    ? installerFromState.matchPct
    : FALLBACK_INSTALLER.matchPct;
  const coverage =
    installerFromState?.coverage?.trim() ||
    (installerFromState ? null : FALLBACK_INSTALLER.coverage);
  const bestSuitedFor =
    installerFromState?.bestSuitedFor?.trim() ||
    (installerFromState ? null : FALLBACK_INSTALLER.bestSuitedFor);
  const matchTier =
    installerFromState?.matchTier?.trim() ||
    (installerFromState ? null : FALLBACK_INSTALLER.matchTier);
  const matchScoreLabel =
    typeof matchPct === "number" && Number.isFinite(matchPct)
      ? `Match score: ${Math.round(matchPct)}/100`
      : null;

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    projectTimeline: "",
    additionalNotes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await apiPost("/request-intro", {
        ...formData,
        projectSummary,
      });
      showSuccess(
        "Your introduction request was submitted successfully.",
      );
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Unable to submit request. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!assessmentId) {
      setProjectSummary([...DEFAULT_PROJECT_SUMMARY]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getAssessment(assessmentId);
        if (cancelled) return;
        setProjectSummary(
          buildProjectSummary(data.results ?? null, data.formData ?? null, {
            useDemoDefaults: false,
          }),
        );
      } catch {
        if (cancelled) return;
        setProjectSummary([...EMPTY_PROJECT_SUMMARY]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div>
      <PageSeo
        title="Request Intro | SolarVy"
        description="Request an introduction to matched solar installers based on your Solarvy assessment."
        path="/request-intro"
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <div className="full-body-color">
        <section className="hero d-flex align-items-center ass-bannr py-4">
          <div className="overlay"></div>

          <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
            <div className="row align-items-start text-divs gx-3 gx-lg-4">
              <div className="solar-top-navbar">
                <nav
                  className={`navbar navbar-expand-lg  ${scrolled ? "scrolled" : ""}`}
                >
                  <Link className="navbar-brand" to="/">
                    <img src={logo} alt="logo" className="solar-logo-img" />
                  </Link>

                  <button
                    className="navbar-toggler"
                    type="button"
                    onClick={handleToggle}
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>

                  <div
                    className={`collapse navbar-collapse ${open ? "show" : ""}`}
                  >
                    <ul className="navbar-nav ms-auto align-items-lg-center solar-nav-links">
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to="/how-it-works"
                          onClick={() => setOpen(false)}
                        >
                          How It Works
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link className="nav-link" to="/sample-results">
                          Sample Results
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link className="nav-link" to="/who-its-for">
                          Who It's For
                        </Link>
                      </li>

                      <li className="nav-item">
                        <button
                          className="solar-nav-btn"
                          onClick={() => navigate("/start-assessment")}
                        >
                          Start Assessment
                          <img src={bttnarrow} alt="arrow" />
                        </button>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>
              <div className="nav-bottom-section row align-items-center">
                <div className="col-12 col-lg-12 text-white ">
                  <h1 className="bannr-text start-assesement-banner-text display-5 ass-page ">
                    Request Introduction to {installerName}
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Send your details to this selected installer so they can
                    contact you about your project.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
              <form id="request-intro-form" onSubmit={handleSubmit}>
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="d-flex align-items-start gap-3 mb-4  rounded-3 installer-highlight-box">
                    {/* <div className="installer-avatar-placeholder"></div> */}
                    <div className="flex-grow-1">
                      <h5 className="fw-bold mb-2 heading-ass">
                        {installerName}
                      </h5>
                      <div className="d-flex flex-wrap gap-2">
                        {matchScoreLabel && (
                          <span className="badge bg-success ri-match-badge">
                            {matchScoreLabel}
                          </span>
                        )}
                        {coverage && (
                          <span className="badge bg-secondary ri-match-badge">
                            {coverage}
                          </span>
                        )}
                        {bestSuitedFor && (
                          <span className="badge bg-secondary ri-match-badge">
                            {bestSuitedFor}
                          </span>
                        )}
                        {matchTier && (
                          <span className="badge bg-secondary ri-match-badge">
                            {matchTier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <div className="step-box me-3 request-intro-step-box">
                      1
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Your Contact Information
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        How should the installer reach you?
                      </p>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        FULL NAME
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        PHONE NUMBER
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        placeholder="e.g. +234..."
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        EMAIL ADDRESS
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        placeholder="name@email.com"
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label ass-field-label">
                        PROJECT TIMELINE
                      </label>
                      <select
                        name="projectTimeline"
                        value={formData.projectTimeline}
                        onChange={handleChange}
                        className="form-select ass-field-control"
                        required
                      >
                        <option value="">Select timeline</option>
                        <option value="immediately">Immediately</option>
                        <option value="1-month">Within 1 month</option>
                        <option value="1-3-months">1–3 months</option>
                        <option value="3-6-months">3–6 months</option>
                        <option value="exploring">Just exploring</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        ANYTHING YOU WANT THE INSTALLER TO KNOW? (OPTIONAL)
                      </label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        rows={4}
                        placeholder="For example: I want battery backup included, I already use a generator, I prefer weekend contact, or I already received another quote."
                      ></textarea>
                    </div>
                  </div>

                  <div className="alert alert-info mt-3 py-1" role="alert">
                    <small style={{ fontSize: "10px", lineHeight: "0.5" }}>
                      <strong>Privacy Notice:</strong> Your details will be
                      shared only with this selected installer for the purpose
                      of responding to your project enquiry.
                    </small>
                  </div>
                </div>

                {submitError && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="d-none d-lg-flex gap-3 flex-wrap mt-3 mb-4">
                  <button
                    type="submit"
                    className="btn-primary-custom calu"
                    disabled={isSubmitting}
                  >
                    <span className="icon-sun">
                      <img src={sunone} alt="icon" />
                    </span>
                    <span>Request Introduction</span>
                    <span className="arrows">
                      <img src={sunthree} alt="icon" />
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn-outline-custom2 calu-2"
                    onClick={() =>
                      navigate(
                        assessmentId
                          ? `/matched-installers?assessment=${encodeURIComponent(assessmentId)}`
                          : "/matched-installers",
                        { state: { from: "request-intro" } },
                      )
                    }
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <aside className="ri-aside">
                <div className="ri-aside-card">
                  <h5 className="ri-aside-title">Project Summary</h5>
                  <p className="ri-aside-desc">
                    This is the project information already carried over from
                    your Solarvy results.
                  </p>

                  <div className="ri-summary-grid">
                    {projectSummary.map((item) => (
                      <div className="ri-summary-cell" key={item.label}>
                        <span className="ri-summary-label">{item.label}</span>
                        <span className="ri-summary-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ri-aside-card">
                  <h5 className="ri-aside-title">Why This Works</h5>

                  <ul className="ri-benefits">
                    <li className="ri-benefit">
                      <CheckCircle2
                        size={18}
                        className="ri-benefit-icon"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <div className="ri-benefit-body">
                        <strong className="ri-benefit-heading">
                          Selected installer only
                        </strong>
                        <p className="ri-benefit-copy">
                          Your request is tied to the installer you chose.
                        </p>
                      </div>
                    </li>
                    <li className="ri-benefit">
                      <CheckCircle2
                        size={18}
                        className="ri-benefit-icon"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <div className="ri-benefit-body">
                        <strong className="ri-benefit-heading">
                          No repeated assessment
                        </strong>
                        <p className="ri-benefit-copy">
                          You do not need to enter all your project details
                          again.
                        </p>
                      </div>
                    </li>
                    <li className="ri-benefit">
                      <CheckCircle2
                        size={18}
                        className="ri-benefit-icon"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <div className="ri-benefit-body">
                        <strong className="ri-benefit-heading">
                          Easy next step
                        </strong>
                        <p className="ri-benefit-copy">
                          Just send your contact details and move forward.
                        </p>
                      </div>
                    </li>
                  </ul>

                  <div className="ri-aside-back">
                    <button
                      type="button"
                      className="btn-outline-customss2"
                      style={{ height: "45px" }}
                      onClick={() =>
                        navigate(
                          assessmentId
                            ? `/matched-installers?assessment=${encodeURIComponent(assessmentId)}`
                            : "/matched-installers",
                          { state: { from: "request-intro" } },
                        )
                      }
                    >
                      <span className="icon-get">
                        <i className="bi bi-arrow-left"></i>
                      </span>
                      <span>Back to installers</span>
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="d-lg-none form-page-mobile-cta px-1">
            <button
              type="submit"
              form="request-intro-form"
              className="btn-primary-custom calu"
            >
              <span className="icon-sun">
                <img src={sunone} alt="" />
              </span>
              <span>Request Introduction</span>
              <span className="arrows">
                <img src={sunthree} alt="" />
              </span>
            </button>
            <button
              type="button"
              className="btn-outline-custom2 calu-2"
              onClick={() =>
                navigate(
                  assessmentId
                    ? `/matched-installers?assessment=${encodeURIComponent(assessmentId)}`
                    : "/matched-installers",
                  { state: { from: "request-intro" } },
                )
              }
            >
              <span>Cancel</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RequestIntro;
