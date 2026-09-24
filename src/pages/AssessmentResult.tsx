import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import "bootstrap/dist/css/bootstrap.min.css";
import buletwo from "../assets/images/icon/bule2.svg";
import Sun from "../assets/images/icon/sun-red.svg";
import halfSun from "../assets/images/icon/half-s.svg";
import batt from "../assets/images/icon/batt.svg";
import money from "../assets/images/icon/money-bag.svg";
import compare from "../assets/images/icon/compare.svg";
import thunder from "../assets/images/icon/thunder.svg";
import imp from "../assets/images/icon/imporent.svg";
import donw from "../assets/images/icon/d11.svg";
import qut from "../assets/images/icon/qut.svg";
import financeIcon from "../assets/result cards icons/finance.png";
import installersIcon from "../assets/result cards icons/insallers.png";
import quotationIcon from "../assets/result cards icons/quotation.png";
import expertReviewIcon from "../assets/result cards icons/expert review.png";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import FeedbackToast from "../components/FeedbackToast";
import QuoteUploadModal from "../components/QuoteUploadModal";
import SolarvyLoader from "../components/SolarvyLoader";
import PageSeo from "../components/PageSeo";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { apiGet } from "../lib/api";
import { getAssessmentRecommendation, getQuickSnapshotRecommendation } from "../lib/assessmentApi";
import type {
  AssessmentFormData,
  AssessmentResults,
} from "../types/assessment";
import {
  downloadAssessmentReport,
  formatAssessmentDate,
  type AssessmentReportInputMethod,
} from "../lib/assessmentReportPdf";
import { trackCtaClick, trackEvent } from "../lib/visitorTracking";

type AssessmentApiResponse = {
  success: boolean;
  data: {
    id: string;
    results: AssessmentResults | null;
    formData?:
      | Pick<AssessmentFormData, "inputMethod">
      | AssessmentFormData
      | null;
  };
};

const MISSING = "N/A";

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Naira — Excel Outputs B15–B18 use ₦#,##0 (whole naira, groups of three). */
const formatNaira = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  return `₦${Math.round(n).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

/** Payback years — one decimal when non-integer, otherwise whole number. */
const formatPaybackYears = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    return String(Math.round(n));
  }
  return (Math.round(n * 10) / 10).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
};

/** Exact numeric from Excel — no forced 1-decimal rounding. */
const formatNumber = (value: unknown, maxFractionDigits = 10): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  // When maxFractionDigits is 1, force one decimal (sizing cards).
  if (maxFractionDigits === 1) {
    return n.toFixed(1);
  }
  return n.toLocaleString("en-NG", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
};

const formatText = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return MISSING;
  return String(value);
};

type StrategyComparisonRow = NonNullable<
  AssessmentResults["strategyComparison"]
>[number];

const STRATEGY_FALLBACK_ROWS: StrategyComparisonRow[] = [
  { strategy: "Grid Only" },
  { strategy: "Grid + Generator" },
  { strategy: "Solar + Grid" },
  { strategy: "Solar + Battery + Generator" },
];

const isDash = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") return true;
  const s = String(value).trim();
  return s === "—" || s === "-" || s === "–";
};

const formatStrategyPayback = (value: unknown): string => {
  if (isDash(value) || toNum(value) === null) return "—";
  return `${formatPaybackYears(value)} yrs`;
};

const isRecommendedStrategy = (value: unknown): boolean =>
  String(value ?? "")
    .trim()
    .toLowerCase() === "recommended";

/** Excel may hold percentages as fractions (0.68) or whole numbers (68). 0% is valid. */
const toPercent = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return 0;
  if (value === "-" || value === "—") return 0;
  const n = toNum(value);
  if (n === null) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const formatPercentLabel = (value: unknown): string => {
  const pct = toPercent(value);
  return pct === null ? MISSING : `${pct}%`;
};

function AssesementResult() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const handleToggle = () => {
    setOpen(!open);
  };

  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [formData, setFormData] = useState<AssessmentFormData | null>(null);
  const [inputMethod, setInputMethod] =
    useState<AssessmentReportInputMethod>("bill");
  const [isLoadingResults, setIsLoadingResults] = useState(
    Boolean(assessmentId),
  );
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendationFailed, setRecommendationFailed] = useState(false);
  const [isLoadingQuickSnapshotRecommendation, setIsLoadingQuickSnapshotRecommendation] =
    useState(false);
  const [quickSnapshotRecommendationFailed, setQuickSnapshotRecommendationFailed] =
    useState(false);
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setIsLoadingResults(false);
      return;
    }

    setRecommendationFailed(false);
    setQuickSnapshotRecommendationFailed(false);
    let cancelled = false;

    (async () => {
      try {
        const response = await apiGet<AssessmentApiResponse>(
          `/assessments/${assessmentId}`,
        );
        if (cancelled) return;

        if (response.data.results) {
          setResults(response.data.results);
        }

        if (response.data.formData) {
          setFormData(response.data.formData as AssessmentFormData);
        }

        const method = response.data.formData?.inputMethod;
        if (
          method === "bill" ||
          method === "appliance" ||
          method === "custom"
        ) {
          setInputMethod(method);
        }

        if (response.data.results?.calculationError) {
          showError(
            "The calculation could not be completed fully. Some values may be unavailable.",
            "Calculation incomplete",
          );
        } else if (!response.data.results) {
          showError("No results were stored for this assessment.");
        }
      } catch {
        if (!cancelled) {
          showError("Unable to load your assessment results.");
        }
      } finally {
        if (!cancelled) setIsLoadingResults(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // showError identity can change each render; only refetch when assessment id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const storedRecommendation = results?.aiRecommendation?.trim() || "";
  const storedQuickSnapshotRecommendation =
    results?.quickSnapshotRecommendation?.trim() || "";
  const canGenerateRecommendation =
    Boolean(results) && !results?.calculationError;

  useEffect(() => {
    if (!assessmentId || isLoadingResults) return;
    if (!canGenerateRecommendation) {
      setIsLoadingRecommendation(false);
      return;
    }
    if (storedRecommendation) {
      setIsLoadingRecommendation(false);
      setRecommendationFailed(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRecommendation(true);
    setRecommendationFailed(false);

    (async () => {
      try {
        const data = await getAssessmentRecommendation(assessmentId);
        if (cancelled) return;
        const text = data.aiRecommendation?.trim() || "";
        if (text) {
          setResults((prev) =>
            prev ? { ...prev, aiRecommendation: text } : prev,
          );
        } else {
          setRecommendationFailed(true);
        }
      } catch {
        if (!cancelled) setRecommendationFailed(true);
      } finally {
        if (!cancelled) setIsLoadingRecommendation(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assessmentId,
    isLoadingResults,
    canGenerateRecommendation,
    storedRecommendation,
  ]);

  useEffect(() => {
    if (!assessmentId || isLoadingResults) return;
    if (!canGenerateRecommendation) {
      setIsLoadingQuickSnapshotRecommendation(false);
      return;
    }
    if (storedQuickSnapshotRecommendation) {
      setIsLoadingQuickSnapshotRecommendation(false);
      setQuickSnapshotRecommendationFailed(false);
      return;
    }

    let cancelled = false;
    setIsLoadingQuickSnapshotRecommendation(true);
    setQuickSnapshotRecommendationFailed(false);

    (async () => {
      try {
        const data = await getQuickSnapshotRecommendation(assessmentId);
        if (cancelled) return;
        const text = data.quickSnapshotRecommendation?.trim() || "";
        if (text) {
          setResults((prev) =>
            prev ? { ...prev, quickSnapshotRecommendation: text } : prev,
          );
        } else {
          setQuickSnapshotRecommendationFailed(true);
        }
      } catch {
        if (!cancelled) setQuickSnapshotRecommendationFailed(true);
      } finally {
        if (!cancelled) setIsLoadingQuickSnapshotRecommendation(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assessmentId,
    isLoadingResults,
    canGenerateRecommendation,
    storedQuickSnapshotRecommendation,
  ]);

  useEffect(() => {
    if (!assessmentId || !results) return;
    void trackEvent("results_viewed", {
      path: window.location.pathname + window.location.search,
      entityType: "assessment",
      entityId: assessmentId,
    });
  }, [assessmentId, results]);

  const handleDownloadReport = async () => {
    if (!results || !assessmentId || isDownloadingReport) return;

    setIsDownloadingReport(true);
    try {
      await downloadAssessmentReport({
        assessmentId,
        inputMethod,
        results: {
          ...results,
          city: results.city ?? formData?.city,
          country: results.country ?? formData?.country,
        },
        assessmentDate: formatAssessmentDate(),
      });
      void trackEvent("pdf_download", {
        entityType: "assessment",
        entityId: assessmentId,
      });
    } catch {
      showError("Unable to generate the PDF report. Please try again.");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const solarKwp = formatNumber(results?.recommendedSolarKwp, 1);
  const batteryKwh = formatNumber(results?.recommendedBatteryKwh, 1);
  const inverterKw = formatNumber(results?.recommendedInverterKw, 1);
  const systemCost = formatNaira(results?.estimatedSystemCost);
  const grossSavings = formatNaira(results?.grossAnnualSavings);
  const omAllowance = formatNaira(results?.annualOmAllowance);
  const netSavings = formatNaira(results?.netAnnualSavings);
  const paybackYears = formatPaybackYears(results?.simplePaybackYears);
  const solarSharePct = toPercent(results?.solarShare);
  const gridOffsetPct = toPercent(results?.gridOffset);
  const dieselReductionPct = toPercent(results?.dieselReduction);
  const annualPvGeneration = formatNumber(results?.annualPvGenerationKwh);
  const usableSolar = formatNumber(results?.usableSolarKwh);
  // Excel Outputs B20 uses #,##0.0 — show 0.0L when null/zero, not "—".
  const dieselSavedLitres = (() => {
    const n = toNum(results?.dieselSavedLitres) ?? 0;
    return `${n.toLocaleString("en-NG", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}L`;
  })();
  const leadType = formatText(results?.leadType);
  const recommendedNextStep = formatText(results?.recommendedNextStep);
  const primaryRecommendation = formatText(results?.primaryRecommendation);
  const confidenceNote = formatText(results?.confidenceNote);
  const systemClass = formatText(results?.systemClass);
  const disclaimer =
    results?.disclaimer ||
    "These results are indicative only. Final system design, procurement, and performance should be validated through a detailed review before investment or installation.";

  const showRecommendationSkeleton =
    Boolean(assessmentId) &&
    !storedRecommendation &&
    !recommendationFailed &&
    !results?.calculationError &&
    (isLoadingResults || isLoadingRecommendation || canGenerateRecommendation);

  const showQuickSnapshotRecommendationSkeleton =
    Boolean(assessmentId) &&
    !storedQuickSnapshotRecommendation &&
    !quickSnapshotRecommendationFailed &&
    !results?.calculationError &&
    (isLoadingResults ||
      isLoadingQuickSnapshotRecommendation ||
      canGenerateRecommendation);

  const recommendationFallback =
    primaryRecommendation !== MISSING
      ? `Based on this assessment, ${primaryRecommendation} is the recommended option. Treat these figures as a planning baseline, then confirm sizing with a site review before you invest.`
      : "Your recommendation will appear here once the assessment results are ready.";

  const quickSnapshotRecommendationFallback =
    primaryRecommendation !== MISSING
      ? `${primaryRecommendation} is the planning baseline for this site. Confirm sizing with a site review before you invest.`
      : "Your snapshot summary will appear here once the assessment results are ready.";

  const strategyComparisonRows =
    results?.strategyComparison && results.strategyComparison.length > 0
      ? results.strategyComparison
      : STRATEGY_FALLBACK_ROWS;

  const [scrolled, setScrolled] = useState(false);

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
        setOpen(false); // reset menu on desktop
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div>
      <PageSeo
        title="Assessment Results | SolarVy"
        description="Your Solarvy assessment results with recommended system sizing, savings, and payback."
        path="/assessment-result"
        noindex
      />
      <SolarvyLoader
        open={isLoadingResults}
        message="Loading your assessment results..."
      />
      <FeedbackToast toast={toast} onClose={clearToast} />
      <QuoteUploadModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        assessmentId={assessmentId || undefined}
        onSuccess={() => {
          showSuccess(
            "Quote uploaded successfully. Our team can use it for comparison.",
          );
        }}
      />
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
                  <h1 className="bannr-text display-5 ass-page ass-result-banner-text">
                    Your preliminary energy{" "}
                    <span className="ass-result-banner-phrase">
                      system recommendation
                    </span>
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two ass-result-banner-desc">
                    Based on the information entered, Solarvy estimates the most
                    suitable solar, battery, and inverter configuration,
                    together with indicative savings and payback.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="ass-result-flow">
            <div className="ass-result-left">
              <div className="ass-result-metrics">
                <div className="row g-2">
                <div className="col-md-4">
                  <div className="card custom-card h-100">
                    <div className="card-body pad">
                      <div className="d-flex align-items-center mb-2 gap-2">
                        <div className="icon-box-sun">
                          <img src={Sun} alt="icon" />
                        </div>
                        <small className="text-uppercase text-muted ">
                          <b>Recommended Solar PV</b>
                        </small>
                      </div>

                      <h2 className="fw-bold sun-head">
                        {solarKwp} <span className="fs-5 sun-sub">kWp</span>
                      </h2>

                      <small className="roof-text-text-muted d-block mb-2">
                        <b>Indicative roof size</b>
                      </small>

                      <small className=" pv-text text-danger fw-semibold">
                        ● PV sizing complete
                      </small>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card custom-card h-100">
                    <div className="card-body pad">
                      <div className="d-flex align-items-center mb-2 gap-2">
                        <div className="icon-box-battery">
                          <img src={batt} alt="icon" />
                        </div>
                        <small className="text-uppercase text-muted ">
                          <b>Recommended Battery</b>
                        </small>
                      </div>

                      <h2 className="fw-bold sun-head">
                        {batteryKwh} <span className="fs-5 sun-sub">kWh</span>
                      </h2>

                      <small className="roof-text-text-muted d-block mb-2">
                        <b>Sized for backup target</b>
                      </small>

                      <small className=" pv-texts text-danger fw-semibold">
                        ● Battery sizing complete
                      </small>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card custom-card h-100">
                    <div className="card-body pad">
                      <div className="d-flex align-items-center mb-2 gap-2">
                        <div className="icon-box-act">
                          <img src={halfSun} alt="icon" />
                        </div>
                        <small className="text-uppercase text-muted">
                          <b>Recommended Inverter</b>
                        </small>

                        {/* <div className="download-icon-mobile">
                          <img src={donw} alt="logo" />
                        </div> */}
                      </div>

                      <h2 className="fw-bold sun-head">
                        {inverterKw} <span className="fs-5 sun-sub">kW</span>
                      </h2>

                      <small className="roof-text-text-muted d-block mb-2">
                        <b>Peak load protected</b>
                      </small>

                      <small className=" pv-textss text-danger fw-semibold">
                        ● Inverter sizing complete
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div
                id="ass-result-financial"
                className="p-4 shadow-sm rounded-4 ass-resul-first mt-4"
              >
                <div className="d-flex align-items-center mb-4">
                  <div className="icon-box-maony me-3">
                    <img src={money} alt="icon" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1 rang-head section-card-title">
                      Financial Summary
                    </h5>
                    <p className="text-muted small mb-0 para-ass">
                      Understand the commercial side quickly, without technical
                      jargon.
                    </p>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 border-md-end">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Estimated system cost</span>
                      <strong className="rang-head">{systemCost}</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Gross annual savings</span>
                      <strong className="rang-head">{grossSavings}</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Annual O&M allowance</span>
                      <strong className="rang-head">{omAllowance}</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Net annual savings</span>
                      <strong className="rang-head">{netSavings}</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between border-0">
                      <span className="rang-name">Simple payback</span>
                      <strong className="rang-head">
                        {paybackYears === MISSING
                          ? MISSING
                          : `${paybackYears} years`}
                      </strong>
                    </div>
                  </div>

                  <div className="col-md-6 ps-md-4 mt-4 mt-md-0 d-none d-md-block">
                    <h6 className="left-rang fw-bold mb-3">Your Energy Mix</h6>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Solar share</span>
                        <strong className="per-rang">
                          {formatPercentLabel(results?.solarShare)}
                        </strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-danger"
                          style={{ width: `${solarSharePct ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Grid offset</span>
                        <strong className="per-rang">
                          {formatPercentLabel(results?.gridOffset)}
                        </strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: `${gridOffsetPct ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Diesel reduction</span>
                        <strong className="per-rang">
                          {formatPercentLabel(results?.dieselReduction)}
                        </strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-success"
                          style={{
                            width: `${dieselReductionPct ?? 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 shadow-sm rounded-4 ass-resul-first mt-4 d-md-none">
                <div className="d-flex align-items-start mb-4">
                  <div className="icon-box-maony me-3">
                    <img src={thunder} alt="" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1 rang-head section-card-title">
                      Your Energy Mix
                    </h5>
                    <small className="text-muted">
                      This shows how solar, grid, and generator power work
                      together to supply your energy.
                    </small>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span className="rang-name">Solar share</span>
                    <strong className="per-rang">
                      {formatPercentLabel(results?.solarShare)}
                    </strong>
                  </div>
                  <div className="progress custom-progress">
                    <div
                      className="progress-bar bg-danger"
                      style={{ width: `${solarSharePct ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <span className="rang-name">Grid offset</span>
                    <strong className="per-rang">
                      {formatPercentLabel(results?.gridOffset)}
                    </strong>
                  </div>
                  <div className="progress custom-progress">
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${gridOffsetPct ?? 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="d-flex justify-content-between">
                    <span className="rang-name">Diesel reduction</span>
                    <strong className="per-rang">
                      {formatPercentLabel(results?.dieselReduction)}
                    </strong>
                  </div>
                  <div className="progress custom-progress">
                    <div
                      className="progress-bar bg-success"
                      style={{
                        width: `${dieselReductionPct ?? 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

             
              </div>

              <div className="ass-result-compare-wrap">
                <div className="p-3 p-md-4 shadow-sm rounded-4 ass-resul-first ass-result-compare-card">
                  <div className="d-flex align-items-start mb-4">
                    <div className="icon-box-maony me-3">
                      <img src={compare} alt="icon" />
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1 rang-head section-card-title">
                        Compare Your Power Options
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        This helps you assess your options and see which one
                        gives you the best results.
                      </p>
                    </div>
                  </div>
                  <div className="custom-table">
                    <div className="custom-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>POWER OPTION</th>
                            <th>ANNUAL COST</th>
                            <th>RELIABILITY</th>
                            <th>DIESEL USE</th>
                            <th>PAYBACK</th>
                          </tr>
                        </thead>

                        <tbody>
                          {strategyComparisonRows.map((row) => {
                            const recommended = isRecommendedStrategy(
                              row.recommended,
                            );

                            return (
                              <tr
                                key={row.strategy}
                                className={
                                  recommended ? "recommended-row" : undefined
                                }
                              >
                                <td
                                  className={
                                    recommended
                                      ? "text-color-b title-cell"
                                      : undefined
                                  }
                                >
                                  {recommended ? (
                                    <>
                                      <span className="title-text">
                                        {row.strategy}
                                      </span>
                                      <span className="badge-recommended">
                                        Recommended
                                      </span>
                                    </>
                                  ) : (
                                    row.strategy
                                  )}
                                </td>
                                <td
                                  className={
                                    recommended ? "text-color-b" : undefined
                                  }
                                >
                                  {formatNaira(row.annualCost)}
                                </td>
                                <td
                                  className={
                                    recommended
                                      ? "strong text-color-b"
                                      : undefined
                                  }
                                >
                                  {formatText(row.reliability)}
                                </td>
                                <td
                                  className={
                                    recommended
                                      ? "strong text-color-b"
                                      : undefined
                                  }
                                >
                                  {formatText(row.dieselUse)}
                                </td>
                                <td
                                  className={
                                    recommended
                                      ? "strong text-color-b"
                                      : undefined
                                  }
                                >
                                  {formatStrategyPayback(row.payback)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="important-note d-flex d-lg-none align-items-start p-3 mt-4">
                  <div className="me-2 mt-0">
                    <img src={imp} alt="icon" />
                  </div>

                  <div>
                    <span className="fw-bold">Important note:</span>{" "}
                    {disclaimer}
                  </div>
                </div>
              </div>
              <div className="important-note d-none d-lg-flex align-items-start p-3 mt-1">
                <div className="me-2 mt-0">
                  <img src={imp} alt="icon" />
                </div>

                <div>
                  <span className="fw-bold">Important note:</span> {disclaimer}
                </div>
              </div>
            </div>

            <div className="ass-result-right">
              <div className="ass-result-snapshot">
                <div className="p-4 rounded-4 shadow-sm right-panel assts-right">
                  <div className="ass-result-snapshot-header mb-3">
                    <div className="qs-icon" aria-hidden>
                      <img src={qut} alt="" />
                    </div>
                    <div className="ass-result-snapshot-heading">
                      <h6 className="qt-text fw-bold mb-0">Quick Snapshot</h6>
                      <p className="ass-result-snapshot-subtitle mb-0">
                        Your assessment at a glance.
                      </p>
                    </div>
                  </div>

                  <hr className="liness" />

                  <div className="row g-3 flex-wrap qs-metrics">
                    <div className="col-6">
                      <div className="qs-cards h-100">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-graph-up text-primary fs-5"></i>
                        </div>
                        <small className="label">ANNUAL SAVINGS</small>
                        <h5 className="value">{netSavings}</h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards h-100">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-clock-history text-primary fs-5"></i>
                        </div>
                        <small className="label">PAYBACK</small>
                        <h5 className="value">
                          {paybackYears === MISSING
                            ? MISSING
                            : `${paybackYears} yrs`}
                        </h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards h-100">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-fire text-primary fs-5"></i>
                        </div>
                        <small className="label">DIESEL SAVED</small>
                        <h5 className="value">{dieselSavedLitres}</h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards h-100">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-stack text-primary fs-5"></i>
                        </div>
                        <small className="label">SYSTEM CLASS</small>
                        <h5 className="value">{systemClass}</h5>
                      </div>
                    </div>
                  </div>

                  <div className="ass-result-what-means mt-4">
                    <h6 className="ass-result-what-means-title mb-2">
                      What this means
                    </h6>
                    {showQuickSnapshotRecommendationSkeleton ? (
                      <div
                        className="ai-recommendation-skeleton qs-what-means-skeleton"
                        aria-busy="true"
                        aria-label="Loading recommendation"
                      >
                        <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--long" />
                        <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--medium" />
                        <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--short" />
                        <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--medium" />
                      </div>
                    ) : (
                      <p className="ass-result-what-means-body mb-0">
                        {storedQuickSnapshotRecommendation ||
                          quickSnapshotRecommendationFallback}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="ass-result-ai-wrap">
                <div className="p-4 shadow-sm rounded-4 ass-resul-first ai-recommendation-card">
                  <div className="d-flex align-items-center mb-2">
                    <div className="icon-box-maony me-2" aria-hidden>
                      <Sparkles size={12} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                        <h6 className="fw-bold mb-0 rang-head section-card-title">
                          Solarvy Recommendation
                        </h6>
                        {/* <span className="bill-ai-badge">AI</span> */}
                      </div>
                    </div>
                  </div>
                  {showRecommendationSkeleton ? (
                    <div
                      className="ai-recommendation-skeleton"
                      aria-busy="true"
                      aria-label="Loading recommendation"
                    >
                      <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--long" />
                      <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--medium" />
                      <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--short" />
                      <span className="ai-recommendation-skeleton-bar ai-recommendation-skeleton-bar--medium" />
                    </div>
                  ) : (
                    <p className="ai-recommendation-body mb-0">
                      {storedRecommendation || recommendationFallback}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="ass-result-next-wrap">
              <div className="p-3 p-md-4 shadow-sm rounded-4 ass-resul-first ass-result-forward">
                <div className="ass-result-forward-header">
                  <h5 className="fw-bold mb-1 rang-head section-card-title">
                    Take Your Project Forward
                  </h5>
                  <p className="text-muted small mb-0 para-ass">
                    Your assessment is complete. Choose the next step that fits
                    you.
                  </p>
                </div>

                <div className="ass-result-forward-grid">
                  <div className="ass-result-forward-card">
                    <div className="ass-result-forward-card-top">
                      <span
                        className="ass-result-forward-card-icon"
                        aria-hidden
                      >
                        <img src={financeIcon} alt="" />
                      </span>
                      <div>
                        <h6 className="ass-result-forward-card-title">
                          Explore Financing
                        </h6>
                        <p className="ass-result-forward-card-desc">
                          See potential ways to fund your recommended energy
                          system.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ass-result-forward-card-link"
                      onClick={() => {
                        document
                          .getElementById("ass-result-financial")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }}
                    >
                      Explore financing
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>

                  <div className="ass-result-forward-card">
                    <div className="ass-result-forward-card-top">
                      <span
                        className="ass-result-forward-card-icon"
                        aria-hidden
                      >
                        <img src={installersIcon} alt="" />
                      </span>
                      <div>
                        <h6 className="ass-result-forward-card-title">
                          Find Installers
                        </h6>
                        <p className="ass-result-forward-card-desc">
                          View installers matched to your location, project type
                          and system requirements.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ass-result-forward-card-link"
                      onClick={() => {
                        void trackCtaClick("matched_installers", {
                          entityType: "assessment",
                          entityId: assessmentId || undefined,
                        });
                        navigate(
                          assessmentId
                            ? `/matched-installers?assessment=${encodeURIComponent(assessmentId)}`
                            : "/matched-installers",
                          { state: { from: "assessment-result" } },
                        );
                      }}
                    >
                      View matches
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>

                  <div className="ass-result-forward-card">
                    <div className="ass-result-forward-card-top">
                      <span
                        className="ass-result-forward-card-icon"
                        aria-hidden
                      >
                        <img src={quotationIcon} alt="" />
                      </span>
                      <div>
                        <h6 className="ass-result-forward-card-title">
                          Review a Quote
                        </h6>
                        <p className="ass-result-forward-card-desc">
                          Already have a quotation? Upload it and compare it
                          with your SolarVy assessment.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ass-result-forward-card-link"
                      onClick={() => {
                        void trackCtaClick("quote_upload", {
                          entityType: "assessment",
                          entityId: assessmentId || undefined,
                        });
                        setQuoteModalOpen(true);
                      }}
                    >
                      Upload quote
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>

                  <div className="ass-result-forward-card">
                    <div className="ass-result-forward-card-top">
                      <span
                        className="ass-result-forward-card-icon"
                        aria-hidden
                      >
                        <img src={expertReviewIcon} alt="" />
                      </span>
                      <div>
                        <h6 className="ass-result-forward-card-title">
                          Independent Expert Review
                        </h6>
                        <p className="ass-result-forward-card-desc">
                          Get a deeper technical and commercial review before
                          committing to an investment.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ass-result-forward-card-link"
                      onClick={() => {
                        void trackCtaClick("expert_review", {
                          entityType: "assessment",
                          entityId: assessmentId || undefined,
                        });
                        navigate(
                          assessmentId
                            ? `/expert-review?assessment=${encodeURIComponent(assessmentId)}`
                            : "/expert-review",
                          { state: { from: "assessment-result" } },
                        );
                      }}
                    >
                      Get expert review
                      <i className="bi bi-arrow-right" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="ass-result-forward-actions">
                  <button
                    type="button"
                    className="btn-primary-customss-down ass-result-forward-download"
                    onClick={handleDownloadReport}
                    disabled={!results || isDownloadingReport}
                    aria-busy={isDownloadingReport}
                  >
                    <span className="icon-get">
                      <img src={donw} alt="" />
                    </span>
                    <span>
                      {isDownloadingReport
                        ? "Preparing PDF…"
                        : "Download Free Report"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="ass-result-forward-back"
                    onClick={() =>
                      navigate(
                        assessmentId
                          ? `/start-assessment?assessment=${encodeURIComponent(assessmentId)}`
                          : "/start-assessment",
                      )
                    }
                  >
                    <i className="bi bi-arrow-left" aria-hidden />
                    <span>Back to Assessment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AssesementResult;
