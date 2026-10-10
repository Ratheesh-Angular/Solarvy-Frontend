import { useState, useEffect } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import estimateIcon from "../assets/estimate.png";
import { getAssessment } from "../lib/assessmentApi";
import PageSeo from "../components/PageSeo";
import Breadcrumbs from "../components/Breadcrumbs";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import type { AssessmentResults } from "../types/assessment";
import {
  FINANCING_ROUTE_LABELS,
  formatNaira,
  loadFinancingEnquiry,
  loadFinancingRequest,
  toNumber,
  type FinancingEnquiry,
  type FinancingPreferences,
} from "../lib/financing";

type FinancingStatusLocationState = {
  financing?: FinancingPreferences;
  enquiry?: FinancingEnquiry;
};

type StepState = "done" | "active" | "pending";

const MISSING = "—";

const STATUS_STEPS: Array<{ title: string; copy: string; state: StepState }> =
  [
    {
      title: "Enquiry submitted",
      copy: "Your financing request and authorised project information were sent.",
      state: "done",
    },
    {
      title: "Provider review",
      copy: "The provider is reviewing the enquiry. Additional information may be requested.",
      state: "active",
    },
    {
      title: "Additional information",
      copy: "If required, the provider may request documents or clarification directly or through the agreed process.",
      state: "pending",
    },
    {
      title: "Offer / decision",
      copy: "If the provider issues terms, SolarVy can display the provider-supplied offer for your review.",
      state: "pending",
    },
    {
      title: "Your decision",
      copy: "You decide whether to accept, decline or continue discussing the provider's terms.",
      state: "pending",
    },
  ];

const OFFER_ITEMS = [
  "Amount offered",
  "Deposit / equity contribution",
  "Tenor and repayment schedule",
  "Provider-stated interest/profit rate and fees",
  "Security or other conditions",
  "Offer validity / expiry",
];

function formatSize(value: unknown, unit: string): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-NG")} ${unit}`;
}

function formatSubmittedDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day} ${month} ${date.getFullYear()}`;
}

function FinancingStatus() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment")?.trim() || "";
  const withAssessment = (path: string) =>
    assessmentId
      ? `${path}${path.includes("?") ? "&" : "?"}assessment=${encodeURIComponent(assessmentId)}`
      : path;

  const locationState = location.state as FinancingStatusLocationState | null;
  const [enquiry] = useState<FinancingEnquiry | null>(
    () => locationState?.enquiry ?? loadFinancingEnquiry(assessmentId),
  );
  const [financing] = useState<FinancingPreferences | null>(
    () => locationState?.financing ?? loadFinancingRequest(assessmentId),
  );
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const { toast, showError, clearToast } = useFeedbackToast();

  const routeLabel = enquiry ? FINANCING_ROUTE_LABELS[enquiry.route] : "";
  const submittedDate = enquiry ? formatSubmittedDate(enquiry.submittedAt) : null;
  const projectCost = toNumber(results?.estimatedSystemCost);
  const solar = formatSize(results?.recommendedSolarKwp, "kWp");
  const battery = formatSize(results?.recommendedBatteryKwh, "kWh");
  const propertyAndLocation = [propertyType, financing?.location]
    .filter(Boolean)
    .join(" · ");
  const system = [solar, battery].filter(Boolean).join(" + ");

  const projectSummary = [
    { label: "Property", value: propertyAndLocation || MISSING },
    { label: "System", value: system || MISSING },
    { label: "Project cost", value: formatNaira(projectCost) || MISSING },
    {
      label: "Finance requested",
      value: formatNaira(financing?.amountToFinance) || MISSING,
    },
    {
      label: "Deposit",
      value: formatNaira(financing?.depositAvailable) || MISSING,
    },
  ];

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  useEffect(() => {
    if (!assessmentId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getAssessment(assessmentId);
        if (cancelled) return;
        const loaded = data.results ?? null;
        const form = data.formData as
          | { propertyType?: string }
          | null
          | undefined;
        setResults(loaded);
        setPropertyType(
          loaded?.propertyType?.trim() || form?.propertyType?.trim() || null,
        );
      } catch {
        if (cancelled) return;
        setResults(null);
        showError("We couldn't load your assessment details.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessmentId, showError]);

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
        title="Project Financing Status | SolarVy"
        description="Track the financing enquiry connected to your SolarVy energy project, from submission through provider review to your decision."
        path="/financing-status"
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
                    Project financing
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Track the financing activity connected to your SolarVy
                    energy project in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          {!enquiry ? (
            <div className="p-4 shadow-sm rounded-4 ass-first fin-empty">
              <span className="fin-section-icon fin-empty-icon" aria-hidden>
                <i className="bi bi-clipboard-plus"></i>
              </span>
              <h5 className="fw-bold mb-1 heading-ass">
                No financing enquiry yet
              </h5>
              <p className="text-muted small mb-0 para-ass">
                Send a financing enquiry to a partner to track its progress
                here.
              </p>
              <div className="fin-actions fin-actions--plain fin-actions--center">
                <button
                  type="button"
                  className="btn-outline-customsss2-req"
                  onClick={() => navigate(withAssessment("/assessment-result"))}
                >
                  <i className="bi bi-arrow-left" aria-hidden />
                  <span>Back to Results</span>
                </button>
                <button
                  type="button"
                  className="btn-primary-customss-down"
                  onClick={() => navigate(withAssessment("/explore-financing"))}
                >
                  <i className="bi bi-bank" aria-hidden />
                  <span>Start Financing Request</span>
                  <i className="bi bi-arrow-right" aria-hidden />
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-4 align-items-start">
              <div className="col-12">
                <div className="fin-status" role="status">
                  <span className="fin-status-icon" aria-hidden>
                    <i className="bi bi-check-lg"></i>
                  </span>
                  <div>
                    <strong className="fin-status-title">
                      Financing enquiry submitted
                    </strong>
                    <p className="fin-status-copy">
                      Your enquiry has been recorded and sent to{" "}
                      {enquiry.partnerName}.
                      {enquiry.reference && (
                        <>
                          {" "}
                          Reference: <strong>{enquiry.reference}</strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="fin-card-topline">
                    <span className="fin-badge fin-badge--blue">
                      <i className="bi bi-hourglass-split" aria-hidden />
                      Under review
                    </span>
                  </div>
                  <h5 className="fw-bold mb-1 heading-ass">
                    {enquiry.partnerName}
                  </h5>
                  <p className="text-muted small mb-0 para-ass">
                    {[routeLabel, submittedDate && `Submitted ${submittedDate}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <ol className="fin-steps fin-steps--wide fin-status-steps">
                    {STATUS_STEPS.map((step, index) => (
                      <li
                        className={`fin-step fin-step--${step.state}`}
                        key={step.title}
                        aria-current={step.state === "active" ? "step" : undefined}
                      >
                        <div className="step-box">
                          {step.state === "done" ? (
                            <i className="bi bi-check-lg" aria-hidden />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="ri-benefit-body">
                          <strong className="ri-benefit-heading">
                            {step.title}
                          </strong>
                          <p className="ri-benefit-copy">{step.copy}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3 mb-4">
                  <div className="fin-section-head">
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        When an offer arrives
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Confirmed provider terms should be separated from
                        SolarVy estimates.
                      </p>
                    </div>
                  </div>
                  <div className="fin-req fin-req--share">
                    <ul className="fin-req-list">
                      {OFFER_ITEMS.map((item) => (
                        <li key={item}>
                          <i className="bi bi-check2" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <aside className="ri-aside">
                  <div className="ri-aside-card">
                    <div className="fin-aside-head">
                      <span className="fin-aside-icon" aria-hidden>
                        <img src={estimateIcon} alt="" aria-hidden />
                      </span>
                      <h5 className="ri-aside-title mb-0">Your project</h5>
                    </div>
                    <dl className="fin-summary">
                      {projectSummary.map((row) => (
                        <div className="fin-summary-row" key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="fin-actions fin-actions--stack">
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/assessment-result"))
                        }
                      >
                        <i className="bi bi-clipboard-data" aria-hidden />
                        <span>View Assessment</span>
                      </button>
                    </div>
                  </div>

                  <div className="ri-aside-card">
                    <h5 className="ri-aside-title">Project actions</h5>
                    <p className="ri-aside-desc">
                      Keep your energy project moving while the provider
                      reviews your enquiry.
                    </p>
                    <div className="fin-actions fin-actions--stack">
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/matched-installers"))
                        }
                      >
                        <i className="bi bi-people" aria-hidden />
                        <span>View Installers</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/expert-review"))
                        }
                      >
                        <i className="bi bi-patch-check" aria-hidden />
                        <span>Expert Review</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/assessment-result"))
                        }
                      >
                        <i className="bi bi-grid" aria-hidden />
                        <span>Project Overview</span>
                      </button>
                    </div>
                  </div>

                  <div className="fin-notice" role="note">
                    <i className="bi bi-exclamation-triangle" aria-hidden />
                    <p>
                      <strong>Status wording matters.</strong> “Under review”
                      means only that the enquiry has been submitted for
                      provider consideration. It does not mean approved.
                    </p>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default FinancingStatus;
