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
  FINANCING_PARTNERS,
  FINANCING_ROUTE_ICONS,
  FINANCING_ROUTE_LABELS,
  createFinancingReference,
  formatNaira,
  isFinancingRouteId,
  loadFinancingRequest,
  repaymentLabel,
  saveFinancingEnquiry,
  toNumber,
  type FinancingEnquiry as FinancingEnquiryRecord,
  type FinancingPartner,
  type FinancingPreferences,
  type FinancingRouteId,
} from "../lib/financing";

type FinancingEnquiryLocationState = {
  financing?: FinancingPreferences;
  partner?: FinancingPartner;
};

type ConfirmErrors = Partial<Record<"accurate" | "terms", string>>;

const MISSING = "—";

function formatSize(value: unknown, unit: string): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-NG")} ${unit}`;
}

function FinancingEnquiry() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment")?.trim() || "";
  const routeParam = searchParams.get("route");
  const routeId: FinancingRouteId = isFinancingRouteId(routeParam)
    ? routeParam
    : "asset-financing";
  const routeLabel = FINANCING_ROUTE_LABELS[routeId];
  const partnerParam = searchParams.get("partner")?.trim() || "";
  const withAssessment = (path: string) =>
    assessmentId
      ? `${path}${path.includes("?") ? "&" : "?"}assessment=${encodeURIComponent(assessmentId)}`
      : path;

  const locationState =
    location.state as FinancingEnquiryLocationState | null;
  const [financing] = useState<FinancingPreferences | null>(
    () => locationState?.financing ?? loadFinancingRequest(assessmentId),
  );
  const [partner] = useState<FinancingPartner | null>(() => {
    const fromState = locationState?.partner;
    if (fromState && (!partnerParam || fromState.id === partnerParam)) {
      return fromState;
    }
    return (
      FINANCING_PARTNERS[routeId].find((p) => p.id === partnerParam) ?? null
    );
  });
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [errors, setErrors] = useState<ConfirmErrors>({});
  const { toast, showError, clearToast } = useFeedbackToast();

  const projectCost = toNumber(results?.estimatedSystemCost);
  const solar = formatSize(results?.recommendedSolarKwp, "kWp");
  const battery = formatSize(results?.recommendedBatteryKwh, "kWh");
  const propertyAndLocation = [propertyType, financing?.location]
    .filter(Boolean)
    .join(" · ");

  const requestSummary = financing
    ? [
        {
          label: "Estimated project cost",
          value: formatNaira(projectCost) || MISSING,
        },
        {
          label: "Amount requested",
          value: formatNaira(financing.amountToFinance) || MISSING,
        },
        {
          label: "Deposit available",
          value: formatNaira(financing.depositAvailable) || MISSING,
        },
        {
          label: "Preferred period",
          value: repaymentLabel(financing.repaymentPeriod) || MISSING,
        },
        {
          label: "Applicant type",
          value: financing.applicantType || MISSING,
        },
      ]
    : [];

  const sharedItems = [
    propertyAndLocation
      ? `Property type and location (${propertyAndLocation})`
      : "Property type and location",
    solar ? `${solar} solar recommendation` : "Solar system recommendation",
    battery ? `${battery} battery recommendation` : "Battery recommendation",
    "Estimated project cost and savings",
    "Financing amount, deposit and preferred tenor",
    "Applicant information supplied for this enquiry",
  ];

  const partnersPath = withAssessment(`/financing-partners?route=${routeId}`);

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const clearError = (key: keyof ConfirmErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSend = () => {
    if (!financing || !partner) return;

    const nextErrors: ConfirmErrors = {};
    if (!confirmAccurate) {
      nextErrors.accurate =
        "Please confirm your information is correct and authorise SolarVy to send it.";
    }
    if (!confirmTerms) {
      nextErrors.terms =
        "Please confirm you understand this enquiry is not an approval or credit offer.";
    }
    setErrors(nextErrors);

    const firstKey = (["accurate", "terms"] as const).find(
      (key) => nextErrors[key],
    );
    if (firstKey) {
      document
        .getElementById(`fin-field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    clearToast();

    const enquiry: FinancingEnquiryRecord = {
      route: routeId,
      partnerId: partner.id,
      partnerName: partner.name,
      submittedAt: new Date().toISOString(),
      reference: createFinancingReference(),
    };
    saveFinancingEnquiry(assessmentId, enquiry);
    navigate(
      withAssessment(
        `/financing-status?route=${routeId}&partner=${encodeURIComponent(partner.id)}`,
      ),
      { state: { financing, route: routeId, partner, enquiry } },
    );
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
        title="Review & Send Financing Enquiry | SolarVy"
        description="Check your financing request, project information and the details that will be shared with your selected financing provider before you submit."
        path="/financing-enquiry"
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
                    Review &amp; send your enquiry
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Check the financing request, project information and
                    details that will be shared with your selected provider
                    before you submit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          {!financing || !partner ? (
            <div className="p-4 shadow-sm rounded-4 ass-first fin-empty">
              <span className="fin-section-icon fin-empty-icon" aria-hidden>
                <i className="bi bi-clipboard-plus"></i>
              </span>
              <h5 className="fw-bold mb-1 heading-ass">
                {!financing
                  ? "No financing request yet"
                  : "No financing partner selected"}
              </h5>
              <p className="text-muted small mb-0 para-ass">
                {!financing
                  ? "Tell us how you would like to fund your recommended system before reviewing an enquiry."
                  : "Choose a financing partner to review and send your enquiry."}
              </p>
              <div className="fin-actions fin-actions--plain fin-actions--center">
                {financing ? (
                  <button
                    type="button"
                    className="btn-primary-customss-down"
                    onClick={() =>
                      navigate(partnersPath, { state: { financing } })
                    }
                  >
                    <i className="bi bi-people" aria-hidden />
                    <span>Choose a Partner</span>
                    <i className="bi bi-arrow-right" aria-hidden />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-outline-customsss2-req"
                      onClick={() =>
                        navigate(withAssessment("/assessment-result"))
                      }
                    >
                      <i className="bi bi-arrow-left" aria-hidden />
                      <span>Back to Results</span>
                    </button>
                    <button
                      type="button"
                      className="btn-primary-customss-down"
                      onClick={() =>
                        navigate(withAssessment("/explore-financing"))
                      }
                    >
                      <i className="bi bi-bank" aria-hidden />
                      <span>Start Financing Request</span>
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="row g-4 align-items-start">
              <div className="col-lg-8">
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="fin-card-topline">
                    <span className="fin-badge">
                      <i className="bi bi-check-circle-fill" aria-hidden />
                      Selected partner
                    </span>
                    {/* <span className="fin-badge fin-badge--blue">
                      <i
                        className={`bi ${FINANCING_ROUTE_ICONS[routeId]}`}
                        aria-hidden
                      />
                      {routeLabel}
                    </span> */}
                  </div>
                  <h5 className="fw-bold mb-1 heading-ass">{partner.name}</h5>
                  <p className="text-muted small mb-0 para-ass">
                    {partner.description}
                  </p>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                  <div className="fin-section-head">
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Your financing request
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        The funding details you asked for in this enquiry.
                      </p>
                    </div>
                  </div>
                  <dl className="fin-summary">
                    {requestSummary.map((row) => (
                      <div className="fin-summary-row" key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                  <div className="fin-section-head">
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Project information to be shared
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        This is exactly what leaves SolarVy when you send your
                        enquiry to {partner.name}.
                      </p>
                    </div>
                  </div>
                  <div className="fin-req fin-req--share">
                    <ul className="fin-req-list">
                      {sharedItems.map((item) => (
                        <li key={item}>
                          <i className="bi bi-check2" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="fin-disclaimer">
                    <i className="bi bi-info-circle" aria-hidden />
                    <span>
                      Documents such as ID, bank statements or formal credit
                      documents should only be requested where required by the
                      provider and with clear disclosure.
                    </span>
                  </p>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3 mb-4">
                  <div className="fin-section-head">
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Your confirmation
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Nothing is sent to {partner.name} until you confirm
                        both statements below.
                      </p>
                    </div>
                  </div>

                  <div id="fin-field-accurate">
                    <label
                      className="fin-consent-box"
                      htmlFor="fin-confirm-accurate"
                    >
                      <input
                        id="fin-confirm-accurate"
                        type="checkbox"
                        className="form-check-input"
                        checked={confirmAccurate}
                        aria-invalid={Boolean(errors.accurate)}
                        onChange={(e) => {
                          setConfirmAccurate(e.target.checked);
                          clearError("accurate");
                        }}
                      />
                      <span>
                        I confirm that the information above is correct and
                        authorise SolarVy to send this financing enquiry and
                        the listed project information to {partner.name} for
                        assessment.
                      </span>
                    </label>
                    {errors.accurate && (
                      <p className="ass-field-error" role="alert">
                        {errors.accurate}
                      </p>
                    )}
                  </div>

                  <div id="fin-field-terms" className="mt-2">
                    <label
                      className="fin-consent-box"
                      htmlFor="fin-confirm-terms"
                    >
                      <input
                        id="fin-confirm-terms"
                        type="checkbox"
                        className="form-check-input"
                        checked={confirmTerms}
                        aria-invalid={Boolean(errors.terms)}
                        onChange={(e) => {
                          setConfirmTerms(e.target.checked);
                          clearError("terms");
                        }}
                      />
                      <span>
                        I understand that submitting this enquiry is not an
                        approval or credit offer. Final eligibility, pricing,
                        repayment terms and approval are determined by the
                        financing provider.
                      </span>
                    </label>
                    {errors.terms && (
                      <p className="ass-field-error" role="alert">
                        {errors.terms}
                      </p>
                    )}
                  </div>

                  <div className="fin-actions">
                    <button
                      type="button"
                      className="ass-result-forward-back"
                      onClick={() =>
                        navigate(partnersPath, { state: { financing } })
                      }
                    >
                      <i className="bi bi-arrow-left" aria-hidden />
                      <span>Back to Partner Selection</span>
                    </button>

                    <button
                      type="button"
                      className="btn-primary-customss-down"
                      onClick={handleSend}
                    >
                      <i className="bi bi-send" aria-hidden />
                      <span>Send Financing Enquiry</span>
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
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
                      <h5 className="ri-aside-title mb-0">Before you send</h5>
                    </div>
                    <p className="ri-aside-desc">
                      You remain in control of this enquiry.
                    </p>
                    <div className="fin-notice" role="note">
                      <i className="bi bi-shield-check" aria-hidden />
                      <p>
                        <strong>Nothing is shared until you confirm.</strong>{" "}
                        SolarVy organises your project information, while the
                        financing provider handles its own underwriting,
                        KYC/credit checks and final terms.
                      </p>
                    </div>
                  </div>

                  <div className="ri-aside-card">
                    <h5 className="ri-aside-title">
                      Need to change something?
                    </h5>
                    <p className="ri-aside-desc">
                      Update your request or choose a different provider
                      before sending.
                    </p>
                    <div className="fin-actions fin-actions--stack">
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/explore-financing"))
                        }
                      >
                        <i className="bi bi-pencil" aria-hidden />
                        <span>Edit Financing Request</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(partnersPath, { state: { financing } })
                        }
                      >
                        <i className="bi bi-arrow-left-right" aria-hidden />
                        <span>Change Partner</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ass-result-forward-back fin-back-link"
                    onClick={() =>
                      navigate(withAssessment("/assessment-result"))
                    }
                  >
                    <i className="bi bi-arrow-left" aria-hidden />
                    <span>Back to Energy Results</span>
                  </button>
                </aside>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default FinancingEnquiry;
