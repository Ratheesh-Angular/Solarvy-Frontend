import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import estimatedCostIcon from "../assets/solarvy-icons/input_method/Monthly Bill.png";
import systemIcon from "../assets/solarvy-icons/input_method/Custom Equipment.png";
import annualSavingsIcon from "../assets/solarvy-icons/live summary/statistics.png";
import { getAssessment } from "../lib/assessmentApi";
import { getExcelCatalogs } from "../lib/excelApi";
import { matchNigeriaState } from "../lib/geolocation";
import { NIGERIA_STATE_LABELS } from "../lib/nigeriaStates";
import PageSeo from "../components/PageSeo";
import Breadcrumbs from "../components/Breadcrumbs";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import type { AssessmentResults } from "../types/assessment";
import {
  DEFAULT_FINANCE_ROUTE_LABEL,
  FINANCE_APPLICANT_FALLBACKS,
  FINANCE_INCOME_FALLBACKS,
  REPAYMENT_OPTIONS,
  formatNaira,
  loadFinancingRequest,
  normalizeRepaymentPeriod,
  repaymentLabel,
  saveFinancingRequest,
  syncFinanceMatches,
  toNumber,
  type FinancingPreferences,
  type RepaymentPeriod,
} from "../lib/financing";

type ProjectStat = {
  label: string;
  value: string;
  icon: string;
};

type FieldErrors = Partial<
  Record<
    "amountToFinance" | "depositAvailable" | "incomeRange" | "location" | "consent",
    string
  >
>;

const FIELD_ORDER: (keyof FieldErrors)[] = [
  "depositAvailable",
  "amountToFinance",
  "incomeRange",
  "location",
  "consent",
];

const MISSING = "—";
const NOTES_MAX_LENGTH = 500;
const AMOUNT_MAX_DIGITS = 13;

const HOW_IT_WORKS = [
  {
    title: "Tell us your preference",
    copy: "Choose how much you want to finance and your preferred repayment period.",
  },
  {
    title: "SolarVy checks potential routes",
    copy: "Your project and financing request can be matched with relevant partner criteria.",
  },
  {
    title: "Review available next steps",
    copy: "If a route may be suitable, you can choose whether to continue with the provider.",
  },
];

function formatSize(value: unknown, unit: string): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-NG")} ${unit}`;
}

/** Keeps only digits and re-renders as "1,234,567"; the ₦ is a fixed field prefix. */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, AMOUNT_MAX_DIGITS);
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

function buildProjectStats(
  results: AssessmentResults | null | undefined,
): ProjectStat[] {
  const solar = formatSize(results?.recommendedSolarKwp, "kWp");
  const battery = formatSize(results?.recommendedBatteryKwh, "kWh");
  const system =
    solar && battery ? `${solar} + ${battery}` : solar || battery || null;

  return [
    {
      label: "ESTIMATED SYSTEM COST",
      value: formatNaira(results?.estimatedSystemCost) || MISSING,
      icon: estimatedCostIcon,
    },
    { label: "SYSTEM", value: system || MISSING, icon: systemIcon },
    {
      label: "EST. ANNUAL SAVINGS",
      value: formatNaira(results?.netAnnualSavings) || MISSING,
      icon: annualSavingsIcon,
    },
  ];
}

function ExploreFinancing() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment")?.trim() || "";
  const backPath = assessmentId
    ? `/assessment-result?assessment=${encodeURIComponent(assessmentId)}`
    : "/assessment-result";

  const [projectStats, setProjectStats] = useState<ProjectStat[]>(() =>
    buildProjectStats(null),
  );
  const [systemCost, setSystemCost] = useState<number | null>(null);
  const [applicantTypes, setApplicantTypes] = useState<string[]>(
    FINANCE_APPLICANT_FALLBACKS,
  );
  const [incomeRanges, setIncomeRanges] = useState<string[]>(
    FINANCE_INCOME_FALLBACKS,
  );
  const [repaymentOptions, setRepaymentOptions] = useState(REPAYMENT_OPTIONS);
  const [savedRequest] = useState(() => loadFinancingRequest(assessmentId));
  const savedLocation =
    matchNigeriaState(savedRequest?.location ?? "", NIGERIA_STATE_LABELS) ?? "";
  const locationTouched = useRef(Boolean(savedLocation));

  const [formData, setFormData] = useState(() => ({
    applicantType:
      savedRequest?.applicantType || FINANCE_APPLICANT_FALLBACKS[0],
    amountToFinance: savedRequest
      ? formatAmountInput(String(savedRequest.amountToFinance))
      : "",
    depositAvailable:
      savedRequest?.depositAvailable != null
        ? formatAmountInput(String(savedRequest.depositAvailable))
        : "",
    repaymentPeriod: normalizeRepaymentPeriod(
      savedRequest?.repaymentPeriod ?? "24-36 months",
    ),
    incomeRange: savedRequest?.incomeRange ?? "",
    location: savedLocation,
    notes: savedRequest?.notes ?? "",
  }));
  const [consent, setConsent] = useState(savedRequest?.consent ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { toast, showError, clearToast } = useFeedbackToast();

  const clearError = (...keys: (keyof FieldErrors)[]) => {
    setErrors((prev) => {
      if (!keys.some((key) => prev[key])) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  const depositValue = toNumber(formData.depositAvailable);
  const amountValue =
    systemCost !== null && depositValue !== null && depositValue > 0
      ? Math.max(0, systemCost - depositValue)
      : toNumber(formData.amountToFinance);
  const amountDisplay =
    amountValue !== null && amountValue > 0
      ? formatAmountInput(String(Math.round(amountValue)))
      : "";
  const repaymentText = repaymentLabel(formData.repaymentPeriod) || MISSING;
  const requestSummary = [
    { label: "Applicant", value: formData.applicantType || MISSING },
    {
      label: "Amount to finance",
      value: formatNaira(amountValue) || MISSING,
    },
    { label: "Deposit", value: formatNaira(depositValue) || MISSING },
    { label: "Repayment", value: repaymentText },
  ];

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const selectRepayment = (id: RepaymentPeriod) => {
    setFormData((prev) => ({
      ...prev,
      repaymentPeriod: normalizeRepaymentPeriod(id),
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "depositAvailable") {
      clearError("depositAvailable", "amountToFinance");
      const formatted = formatAmountInput(value);
      const deposit = toNumber(formatted);
      const nextAmount =
        systemCost !== null && deposit !== null && deposit > 0
          ? Math.max(0, systemCost - deposit)
          : null;
      setFormData((prev) => ({
        ...prev,
        depositAvailable: formatted,
        amountToFinance:
          nextAmount !== null
            ? formatAmountInput(String(Math.round(nextAmount)))
            : "",
      }));
      return;
    }

    if (name === "incomeRange" || name === "location") {
      clearError(name);
    }

    if (name === "location") {
      locationTouched.current = true;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: FieldErrors = {};
    const location = formData.location.trim();

    if (depositValue === null) {
      nextErrors.depositAvailable = "Please enter the deposit you can provide.";
    } else if (depositValue <= 0) {
      nextErrors.depositAvailable = "Deposit must be greater than zero.";
    } else if (systemCost !== null && depositValue >= systemCost) {
      nextErrors.depositAvailable = `Deposit must be less than your estimated system cost of ${formatNaira(systemCost)}.`;
    }

    if (
      !nextErrors.depositAvailable &&
      (amountValue === null || amountValue <= 0)
    ) {
      nextErrors.amountToFinance =
        "Amount to finance must be greater than zero. Reduce your deposit.";
    }

    if (!formData.incomeRange) {
      nextErrors.incomeRange =
        "Please select your monthly income / business revenue range.";
    }

    if (!location) {
      nextErrors.location = "Please select your location.";
    } else if (!NIGERIA_STATE_LABELS.includes(location)) {
      nextErrors.location = "Please select your location.";
    }

    if (!consent) {
      nextErrors.consent =
        "Please agree to share your financing enquiry before continuing.";
    }

    setErrors(nextErrors);

    const firstKey = FIELD_ORDER.find((key) => nextErrors[key]);
    if (firstKey) {
      document
        .getElementById(`fin-field-${firstKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (amountValue === null || depositValue === null) return;

    if (!assessmentId) {
      showError("Open this page from an assessment result to continue.");
      return;
    }

    clearToast();

    const financing: FinancingPreferences = {
      applicantType: formData.applicantType,
      amountToFinance: amountValue,
      depositAvailable: depositValue,
      repaymentPeriod: normalizeRepaymentPeriod(formData.repaymentPeriod),
      incomeRange: formData.incomeRange,
      location,
      notes: formData.notes.trim(),
      consent,
    };

    setSubmitting(true);
    try {
      await syncFinanceMatches(
        assessmentId,
        financing,
        DEFAULT_FINANCE_ROUTE_LABEL,
      );
      saveFinancingRequest(assessmentId, financing);
      navigate(
        `/financing-options?assessment=${encodeURIComponent(assessmentId)}`,
        { state: { financing } },
      );
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Could not update financing options. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalogs = await getExcelCatalogs();
        if (cancelled) return;
        if (catalogs.financeApplicantTypes?.length) {
          setApplicantTypes(catalogs.financeApplicantTypes);
          setFormData((prev) =>
            catalogs.financeApplicantTypes!.includes(prev.applicantType)
              ? prev
              : {
                  ...prev,
                  applicantType: catalogs.financeApplicantTypes![0],
                },
          );
        }
        if (catalogs.financeIncomeRanges?.length) {
          setIncomeRanges(catalogs.financeIncomeRanges);
        }
        if (catalogs.financeRepaymentTerms?.length) {
          setRepaymentOptions(
            catalogs.financeRepaymentTerms.map((term) => ({
              id: term,
              label: term.replace(/-/g, "–"),
            })),
          );
        }
      } catch {
        /* keep fallbacks */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!assessmentId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getAssessment(assessmentId);
        if (cancelled) return;
        const results = data.results ?? null;
        setProjectStats(buildProjectStats(results));
        const cost = toNumber(results?.estimatedSystemCost);
        setSystemCost(cost);

        const form = data.formData as
          | { state?: string; city?: string }
          | null
          | undefined;
        const candidates = [form?.state, form?.city, results?.city];
        let location = "";
        for (const candidate of candidates) {
          const matched = matchNigeriaState(
            candidate ?? "",
            NIGERIA_STATE_LABELS,
          );
          if (matched) {
            location = matched;
            break;
          }
        }
        if (location && !locationTouched.current) {
          setFormData((prev) =>
            prev.location ? prev : { ...prev, location },
          );
        }

        setFormData((prev) => {
          const deposit = toNumber(prev.depositAvailable);
          if (cost === null || deposit === null || deposit <= 0) return prev;
          const nextAmount = Math.max(0, cost - deposit);
          return {
            ...prev,
            amountToFinance: formatAmountInput(String(Math.round(nextAmount))),
          };
        });
      } catch {
        if (cancelled) return;
        setProjectStats(buildProjectStats(null));
        showError(
          "We couldn't load your assessment details. You can still fill in your financing preferences.",
        );
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
        title="Explore Financing | SolarVy"
        description="Tell us how you would prefer to fund your recommended energy system and SolarVy can help identify potentially suitable financing routes."
        path="/explore-financing"
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
                    Explore financing for your energy project
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Tell us how you would prefer to fund your recommended
                    system. SolarVy can use your assessment to help identify
                    potentially suitable financing routes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
              <form
                id="explore-financing-form"
                onSubmit={handleSubmit}
                noValidate
              >
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="fin-card-topline">
                    <span className="fin-badge">
                      <i className="bi bi-check-circle-fill" aria-hidden />
                      Assessment connected
                    </span>
                    {/* {assessmentId && (
                      <span className="fin-id-chip">
                        <i className="bi bi-file-earmark-text" aria-hidden />
                        Assessment {assessmentId}
                      </span>
                    )} */}
                  </div>

                  <div className="fin-section-head">
                   
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Your recommended project
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        We have carried your assessment details forward, so you
                        do not need to enter them again.
                      </p>
                    </div>
                  </div>

                  <div className="row g-3 fin-stats">
                    {projectStats.map((item) => (
                      <div className="col-12 col-md-4" key={item.label}>
                        <div className="qs-cards h-100">
                          <div className="icon-box-right">
                            <img
                              className="colo-sym-right"
                              src={item.icon}
                              alt=""
                              aria-hidden
                            />
                          </div>
                          <small className="label">{item.label}</small>
                          <h5 className="value">{item.value}</h5>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                  <div className="fin-section-head">
                   
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Financing preferences
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        A few details help us understand the type of funding
                        you are looking for.
                      </p>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        APPLICANT TYPE
                      </label>
                      <select
                        name="applicantType"
                        value={formData.applicantType}
                        onChange={handleChange}
                        className="form-select ass-field-control"
                      >
                        {applicantTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <div className="fin-funding-panel">
                        <div className="row g-3">
                          <div
                            className="col-md-6"
                            id="fin-field-depositAvailable"
                          >
                            <label className="form-label ass-field-label">
                              DEPOSIT AVAILABLE
                            </label>
                            <div
                              className={`fin-naira-input${
                                errors.depositAvailable ? " is-invalid" : ""
                              }`}
                            >
                              <span className="fin-naira-prefix" aria-hidden>
                                ₦
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                name="depositAvailable"
                                value={formData.depositAvailable}
                                onChange={handleChange}
                                className="form-control ass-field-control"
                                placeholder="0"
                                aria-label="Deposit available in naira"
                                aria-invalid={Boolean(errors.depositAvailable)}
                              />
                            </div>
                            {errors.depositAvailable && (
                              <p className="ass-field-error" role="alert">
                                {errors.depositAvailable}
                              </p>
                            )}
                          </div>
                          <div
                            className="col-md-6"
                            id="fin-field-amountToFinance"
                          >
                            <label className="form-label ass-field-label">
                              AMOUNT YOU WANT TO FINANCE
                            </label>
                            <div
                              className={`fin-naira-input fin-naira-input--readonly${
                                errors.amountToFinance ? " is-invalid" : ""
                              }`}
                            >
                              <span className="fin-naira-prefix" aria-hidden>
                                ₦
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                name="amountToFinance"
                                value={amountDisplay}
                                className="form-control ass-field-control"
                                placeholder="0"
                                aria-label="Amount you want to finance in naira"
                                aria-invalid={Boolean(errors.amountToFinance)}
                                disabled
                                readOnly
                              />
                            </div>
                            {errors.amountToFinance && (
                              <p className="ass-field-error" role="alert">
                                {errors.amountToFinance}
                              </p>
                            )}
                          </div>
                        </div>

                        {systemCost !== null ? (
                          <p className="fin-split-hint">
                            Your estimated system cost is{" "}
                            {formatNaira(systemCost)}. Amount to finance is
                            system cost minus deposit.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        PREFERRED REPAYMENT PERIOD
                      </label>
                      <div
                        className="fin-pill-group"
                        role="radiogroup"
                        aria-label="Preferred repayment period"
                      >
                        {repaymentOptions.map((option) => {
                          const active =
                            formData.repaymentPeriod === option.id;
                          return (
                            <button
                              type="button"
                              key={option.id}
                              role="radio"
                              aria-checked={active}
                              className={`fin-pill ${active ? "active" : ""}`}
                              onClick={() => selectRepayment(option.id)}
                            >
                              {active && (
                                <i className="bi bi-check2" aria-hidden />
                              )}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-md-6" id="fin-field-incomeRange">
                      <label className="form-label ass-field-label">
                        MONTHLY INCOME / BUSINESS REVENUE RANGE (₦)
                      </label>
                      <select
                        name="incomeRange"
                        value={formData.incomeRange}
                        onChange={handleChange}
                        className={`form-select ass-field-control${
                          errors.incomeRange ? " is-invalid" : ""
                        }`}
                        aria-invalid={Boolean(errors.incomeRange)}
                        required
                      >
                        <option value="">Select range</option>
                        {incomeRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                      {errors.incomeRange && (
                        <p className="ass-field-error" role="alert">
                          {errors.incomeRange}
                        </p>
                      )}
                    </div>

                    <div className="col-md-6" id="fin-field-location">
                      <label className="form-label ass-field-label">
                        LOCATION
                      </label>
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className={`form-select ass-field-control${
                          errors.location ? " is-invalid" : ""
                        }`}
                        aria-invalid={Boolean(errors.location)}
                        required
                      >
                        <option value="">Select State</option>
                        {NIGERIA_STATE_LABELS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {errors.location && (
                        <p className="ass-field-error" role="alert">
                          {errors.location}
                        </p>
                      )}
                    </div>

                    <div className="col-12">
                      <label
                        className="form-label ass-field-label"
                        htmlFor="fin-notes"
                      >
                        ANYTHING ELSE WE SHOULD KNOW?{" "}
                        <span className="fin-label-optional">(optional)</span>
                      </label>
                      <textarea
                        id="fin-notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        className="form-control ass-field-control fin-textarea"
                        rows={4}
                        maxLength={NOTES_MAX_LENGTH}
                        placeholder="e.g. preferred monthly repayment, business requirements, timeline for installation…"
                      ></textarea>
                      <div className="fin-textarea-footer">
                        <span>
                          Helps financing partners understand your needs.
                        </span>
                        <span className="fin-textarea-count">
                          {formData.notes.length} / {NOTES_MAX_LENGTH}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3 mb-4">
                  <div className="fin-section-head">
                  
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Consent to share
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Your financing enquiry should only be shared with
                        relevant financing partners after you choose to submit
                        it.
                      </p>
                    </div>
                  </div>

                  <div id="fin-field-consent">
                    <label
                      className="fin-consent-box"
                      htmlFor="fin-consent-check"
                    >
                      <input
                        id="fin-consent-check"
                        type="checkbox"
                        className="form-check-input"
                        checked={consent}
                        aria-invalid={Boolean(errors.consent)}
                        onChange={(e) => {
                          setConsent(e.target.checked);
                          clearError("consent");
                        }}
                      />
                      <span>
                        I agree that SolarVy may share the information in this
                        financing enquiry and relevant assessment details with
                        suitable financing partners for consideration.
                      </span>
                    </label>
                    {errors.consent && (
                      <p className="ass-field-error" role="alert">
                        {errors.consent}
                      </p>
                    )}
                  </div>

                  <p className="fin-disclaimer align-items-center">
                    <i className="bi bi-info-circle" aria-hidden />
                    <span>
                      Submitting an enquiry does not guarantee financing or
                      constitute a credit offer. Eligibility, pricing,
                      repayment terms and approval are determined by the
                      financing provider.
                    </span>
                  </p>

                  <div className="fin-actions">
                    <button
                      type="button"
                      className="ass-result-forward-back"
                      onClick={() => navigate(backPath)}
                    >
                      <i className="bi bi-arrow-left" aria-hidden />
                      <span>Back to Results</span>
                    </button>

                    <button
                      type="submit"
                      className="btn-primary-customss-down"
                      disabled={submitting}
                      aria-busy={submitting}
                    >
                      <i className="bi bi-bank" aria-hidden />
                      <span>
                        {submitting
                          ? "Checking options…"
                          : "Check Financing Options"}
                      </span>
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <aside className="ri-aside">
                <div className="ri-aside-card">
                  <h5 className="ri-aside-title">How it works</h5>
                  <p className="ri-aside-desc">
                    Keep the first financing step simple.
                  </p>

                  <ol className="fin-steps">
                    {HOW_IT_WORKS.map((step, index) => (
                      <li className="fin-step" key={step.title}>
                        <div className="step-box">{index + 1}</div>
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

                <div className="ri-aside-card">
                  <div className="live-header">
                    <span className="dot"></span>
                    <span className="live-text">Your request</span>
                  </div>
                  <p className="ri-aside-desc">
                    Updates as you fill in your financing preferences.
                  </p>
                  <dl className="fin-summary">
                    {requestSummary.map((row) => (
                      <div className="fin-summary-row" key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="ri-aside-card">
                  <div className="fin-info">
                    <span className="fin-info-icon" aria-hidden>
                      <i className="bi bi-shield-check"></i>
                    </span>
                    <div>
                      <strong className="fin-info-title">
                        SolarVy remains your energy assessment layer.
                      </strong>
                      <p className="fin-info-copy">
                        Financing decisions, credit checks, interest rates and
                        final terms come from the financing provider—not from
                        the preliminary SolarVy assessment.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExploreFinancing;
