import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import donw from "../assets/images/icon/d11.svg";
import "../css/MatchedInstallers.css";
import PageSeo from "../components/PageSeo";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { getAssessment } from "../lib/assessmentApi";
import { apiPostFormData, ApiError } from "../lib/api";
import type { AssessmentResults } from "../types/assessment";
import { trackCtaClick, trackEvent } from "../lib/visitorTracking";

type SnapshotItem = { label: string; value: string };

type InstallerMatch = NonNullable<
  AssessmentResults["installerMatches"]
>[number];

const DEFAULT_PROJECT_SUMMARY: readonly SnapshotItem[] = [
  { label: "Project type", value: "Small business" },
  { label: "Location", value: "Lagos" },
  { label: "System size", value: "15–25 kWp" },
  { label: "Est. system total", value: "₦18m–₦24m" },
  { label: "Annual savings", value: "₦5.2m" },
  { label: "Payback", value: "3.8–4.6 yrs" },
] as const;

/** Excel-shaped sample rows for direct visits / empty live results. */
const MOCK_INSTALLERS: readonly InstallerMatch[] = [
  {
    cardNumber: 1,
    installerName: "Lagos Hybrid Power Ltd",
    matchPct: 92,
    matchTier: "Excellent Match",
    bestSuitedFor: "Hotel projects",
    coverage: "Lagos",
    strengths: "serves your location; experienced in your projects",
    pricing: "Mid-range",
    response: "Same day",
    primaryCta: "Request Introduction",
    secondaryCta: "Get Expert Review",
  },
  {
    cardNumber: 2,
    installerName: "Prime Critical Power Systems",
    matchPct: 88,
    matchTier: "Good Match",
    bestSuitedFor: "Hotel projects",
    coverage: "Lagos; Ogun",
    strengths: "related project experience",
    pricing: "Premium",
    response: "24-48 hours",
    primaryCta: "Request Introduction",
    secondaryCta: "Get Expert Review",
  },
  {
    cardNumber: 3,
    installerName: "Abuja SolarCare Engineering",
    matchPct: 81,
    matchTier: "Good Match",
    bestSuitedFor: "Hotel projects",
    coverage: "Abuja FCT; Kano; Kaduna",
    strengths: "related project experience",
    pricing: "Mid-range",
    response: "2-3 days",
    primaryCta: "Request Introduction",
    secondaryCta: "Get Expert Review",
  },
  {
    cardNumber: 4,
    installerName: "Coastal Renewables NG",
    matchPct: 78,
    matchTier: "Good Match",
    bestSuitedFor: "Hotel projects",
    coverage: "Ogun; Lagos",
    strengths: "serves your location",
    pricing: "Mid-range",
    response: "24-48 hours",
    primaryCta: "Request Introduction",
    secondaryCta: "Get Expert Review",
  },
  {
    cardNumber: 5,
    installerName: "Northern Grid Solar Ltd",
    matchPct: 74,
    matchTier: "Fair Match",
    bestSuitedFor: "Hotel projects",
    coverage: "Kano; Kaduna",
    strengths: "related project experience",
    pricing: "Value",
    response: "2-3 days",
    primaryCta: "Request Introduction",
    secondaryCta: "Get Expert Review",
  },
] as const;

type MatchAccent = "success" | "warning" | "orange" | "danger";

/** Match % tiers: ≥90 green · 80–89 yellow · 70–79 orange · <70 red */
function matchScoreAccent(score: number | null | undefined): MatchAccent {
  const n = Number(score);
  if (!Number.isFinite(n)) return "danger";
  if (n >= 90) return "success";
  if (n >= 80) return "warning";
  if (n >= 70) return "orange";
  return "danger";
}

function matchScoreAccentClass(score: number | null | undefined): string {
  return `match-score-accent--${matchScoreAccent(score)}`;
}

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

function formatPayback(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-NG")} years`;
}

/** Project snapshot from Excel Outputs: B7, B6, B10, B15, B18, B19. */
function buildProjectSnapshot(results: AssessmentResults | null): SnapshotItem[] {
  if (!results) return [...DEFAULT_PROJECT_SUMMARY];

  const propertyType = results.propertyType?.trim() || null;
  const location = results.country?.trim() || null;

  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Project type", value: propertyType },
    { label: "Location", value: location },
    {
      label: "System size",
      value: formatKwp(results.recommendedSolarKwp),
    },
    {
      label: "Est. system total",
      value: formatNairaShort(results.estimatedSystemCost),
    },
    {
      label: "Annual savings",
      value: formatNairaShort(results.netAnnualSavings),
    },
    {
      label: "Payback",
      value: formatPayback(results.simplePaybackYears),
    },
  ];

  const filled = rows
    .filter((r): r is SnapshotItem => Boolean(r.value))
    .map((r) => ({ label: r.label, value: r.value as string }));

  return filled.length > 0 ? filled : [...DEFAULT_PROJECT_SUMMARY];
}

function formatMatchPct(score: number | null | undefined): string {
  const n = Number(score);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function MatchedInstallers() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");

  const [scrolled, setScrolled] = useState(false);
  const [installers, setInstallers] =
    useState<readonly InstallerMatch[]>(MOCK_INSTALLERS);
  const [projectSummary, setProjectSummary] = useState<readonly SnapshotItem[]>(
    DEFAULT_PROJECT_SUMMARY,
  );
  const [isLoading, setIsLoading] = useState(Boolean(assessmentId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const quoteFileInputRef = useRef<HTMLInputElement>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    location: "",
    additionalNotes: "",
  });
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [quoteFileName, setQuoteFileName] = useState("");
  const [quoteUploading, setQuoteUploading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteModalError, setQuoteModalError] = useState<string | null>(null);
  const { toast, showSuccess, clearToast } = useFeedbackToast();

  const expertReviewPath = assessmentId
    ? `/expert-review?assessment=${encodeURIComponent(assessmentId)}`
    : "/expert-review";

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const resetQuoteModal = () => {
    setQuoteForm({
      fullName: "",
      phoneNumber: "",
      email: "",
      location: "",
      additionalNotes: "",
    });
    setQuoteFile(null);
    setQuoteModalError(null);
    if (quoteFileInputRef.current) {
      quoteFileInputRef.current.value = "";
    }
  };

  const openQuoteModal = () => {
    void trackCtaClick("quote_upload", {
      entityType: assessmentId ? "assessment" : "",
      entityId: assessmentId || undefined,
    });
    setQuoteError(null);
    setQuoteModalError(null);
    setQuoteModalOpen(true);
  };

  const closeQuoteModal = () => {
    if (quoteUploading) return;
    setQuoteModalOpen(false);
    resetQuoteModal();
  };

  const handleQuoteFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setQuoteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuoteModalFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    setQuoteFile(file);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteFile) {
      setQuoteModalError("Please upload an installer quote file.");
      return;
    }

    setQuoteUploading(true);
    setQuoteModalError(null);
    setQuoteError(null);

    try {
      const formData = new FormData();
      formData.append("file", quoteFile);
      formData.append("fullName", quoteForm.fullName.trim());
      formData.append("phoneNumber", quoteForm.phoneNumber.trim());
      formData.append("email", quoteForm.email.trim());
      formData.append("location", quoteForm.location.trim());
      formData.append("additionalNotes", quoteForm.additionalNotes.trim());
      if (assessmentId) {
        formData.append("assessmentId", assessmentId);
      }
      await apiPostFormData("/quote-uploads", formData);
      setQuoteFileName(quoteFile.name);
      setQuoteModalOpen(false);
      resetQuoteModal();
      showSuccess("Quote uploaded successfully. Our team can use it for comparison.");
    } catch (error) {
      setQuoteModalError(
        error instanceof ApiError
          ? error.message
          : "Unable to upload quote. Please try again.",
      );
    } finally {
      setQuoteUploading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    void trackEvent("matched_installers_viewed", {
      path: window.location.pathname + window.location.search,
      entityType: assessmentId ? "assessment" : "",
      entityId: assessmentId || undefined,
    });
  }, [assessmentId]);

  useEffect(() => {
    if (!assessmentId) {
      setInstallers(MOCK_INSTALLERS);
      setProjectSummary(DEFAULT_PROJECT_SUMMARY);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const data = await getAssessment(assessmentId);
        if (cancelled) return;
        const matches = data.results?.installerMatches ?? [];
        setInstallers(matches);
        setProjectSummary(buildProjectSnapshot(data.results ?? null));
      } catch {
        if (cancelled) return;
        setInstallers([]);
        setProjectSummary(DEFAULT_PROJECT_SUMMARY);
        setLoadError("Could not load your assessment matches.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const resultCountLabel = useMemo(() => {
    const n = installers.length;
    if (n === 0) return "0 results";
    return `Top ${n} result${n === 1 ? "" : "s"}`;
  }, [installers.length]);

  const bestMatch = useMemo(() => {
    if (!installers.length) return null;
    return installers.reduce((best, cur) => {
      const a = Number(cur.matchPct);
      const b = Number(best.matchPct);
      const aOk = Number.isFinite(a);
      const bOk = Number.isFinite(b);
      if (aOk && !bOk) return cur;
      if (!aOk) return best;
      return a > b ? cur : best;
    });
  }, [installers]);

  const bestMatchTags = useMemo(() => {
    if (!bestMatch) return [] as string[];
    const tags: string[] = [];
    if (bestMatch.coverage?.trim()) {
      tags.push(bestMatch.coverage.replace(/;/g, ","));
    }
    if (bestMatch.pricing?.trim()) tags.push(bestMatch.pricing.trim());
    if (bestMatch.bestSuitedFor?.trim()) {
      tags.push(bestMatch.bestSuitedFor.trim());
    }
    if (bestMatch.response?.trim()) tags.push(bestMatch.response.trim());
    return tags;
  }, [bestMatch]);

  return (
    <div>
      <PageSeo
        title="Matched Installers | SolarVy"
        description="Review installer matches aligned to your Solarvy project size, location, and budget range."
        path="/matched-installers"
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
                  <h1 className="bannr-text display-5 ass-page ">
                    Your matched installers
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    These installers match your project using your location,
                    system size, project cost, and the savings and payback
                    calculated from your results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 px-3 py-5">
          <div className="row align-items-start">
            <div className="col-lg-8 ">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                  <h5 className="title-main mb-1">Installer shortlist</h5>
                  <p className="sub-text mb-0 mobile-view-match">
                    Matched to your size, cost, timing, and energy setup
                  </p>
                </div>

                <div className="result-badge">{resultCountLabel}</div>
              </div>

              {loadError && (
                <p className="installer-load-note mb-3" role="status">
                  {loadError}
                </p>
              )}

              {isLoading ? (
                <div className="installer-card installer-card--loading p-4">
                  <p className="sub-text mb-0">Loading matched installers…</p>
                </div>
              ) : (
                installers.map((installer, index) => {
                  const accent = matchScoreAccent(installer.matchPct);
                  const rank = installer.cardNumber ?? index + 1;
                  const primaryLabel =
                    installer.primaryCta?.trim() || "Request Introduction";
                  const secondaryLabel =
                    installer.secondaryCta?.trim() || "Get Expert Review";

                  return (
                    <article
                      key={`${installer.installerName}-${rank}`}
                      className={`installer-card installer-dossier match-accent--${accent}`}
                    >
                      <div className="installer-dossier__body">
                        <div className="installer-dossier__header">
                          <div className="installer-dossier__score-block">
                            <span className="installer-rank">#{rank}</span>
                            <div
                              className={`installer-match-pct ${matchScoreAccentClass(installer.matchPct)}`}
                            >
                              {formatMatchPct(installer.matchPct)}
                            </div>
                            {installer.matchTier && (
                              <p
                                className={`installer-match-tier match-tier--${accent}`}
                              >
                                {installer.matchTier}
                              </p>
                            )}
                          </div>

                          <div className="installer-dossier__main">
                            <h6 className="installer-dossier__name">
                              {installer.installerName}
                            </h6>

                            {installer.bestSuitedFor && (
                              <span className="installer-suited-pill">
                                {installer.bestSuitedFor}
                              </span>
                            )}

                            <dl className="installer-meta-grid">
                              {installer.coverage && (
                                <div className="installer-meta-row">
                                  <dt>Coverage</dt>
                                  <dd>{installer.coverage.replace(/;/g, ",")}</dd>
                                </div>
                              )}
                              {installer.strengths && (
                                <div className="installer-meta-row">
                                  <dt>Strengths</dt>
                                  <dd>{installer.strengths}</dd>
                                </div>
                              )}
                            </dl>

                            <div className="installer-chip-row">
                              {installer.pricing && (
                                <span className="installer-chip">
                                  {installer.pricing}
                                </span>
                              )}
                              {installer.response && (
                                <span className="installer-chip">
                                  {installer.response}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="installer-dossier__actions">
                            <button
                              type="button"
                              className="btn-primary-custom-match installer-primary-cta"
                              onClick={() => {
                                void trackCtaClick("request_intro", {
                                  entityType: assessmentId
                                    ? "assessment"
                                    : "installer",
                                  entityId: assessmentId || undefined,
                                  metadata: {
                                    installerName: installer.installerName,
                                  },
                                });
                                navigate(
                                  assessmentId
                                    ? `/request-intro?assessment=${encodeURIComponent(assessmentId)}`
                                    : "/request-intro",
                                  { state: { installer } },
                                );
                              }}
                            >
                              {primaryLabel}
                            </button>
                            <Link
                              to={expertReviewPath}
                              className="installer-secondary-cta"
                              onClick={() => {
                                void trackCtaClick("expert_review", {
                                  entityType: assessmentId
                                    ? "assessment"
                                    : "installer",
                                  entityId: assessmentId || undefined,
                                  metadata: {
                                    installerName: installer.installerName,
                                  },
                                });
                              }}
                            >
                              {secondaryLabel}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="col-lg-4">
              <div
                className="match-snapshot mb-4"
                role="region"
                aria-labelledby="match-snapshot-heading"
              >
                <div className="match-snapshot__header">
                  <h2
                    id="match-snapshot-heading"
                    className="match-snapshot__title"
                  >
                    Your project snapshot
                  </h2>
                  <p className="match-snapshot__hint">
                    These details come from your assessment and shape how we
                    rank installers.
                  </p>
                </div>
                <ul className="match-snapshot__list">
                  {projectSummary.map((item) => (
                    <li key={item.label} className="match-snapshot__row">
                      <span className="match-snapshot__label">
                        {item.label}
                      </span>
                      <span className="match-snapshot__value">
                        {item.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {!isLoading && bestMatch && (
                <div
                  className={`best-match-card match-accent--${matchScoreAccent(bestMatch.matchPct)}`}
                  role="region"
                  aria-labelledby="best-match-heading"
                >
                  <div className="best-match-card__top">
                    <div className="best-match-card__copy">
                      <p className="best-match-card__eyebrow">Best match</p>
                      <h2
                        id="best-match-heading"
                        className="best-match-card__name"
                      >
                        {bestMatch.installerName}
                      </h2>
                      {bestMatch.matchTier && (
                        <p
                          className={`best-match-card__tier match-tier--${matchScoreAccent(bestMatch.matchPct)}`}
                        >
                          {bestMatch.matchTier}
                        </p>
                      )}
                    </div>
                    <div
                      className={`best-match-card__score ${matchScoreAccentClass(bestMatch.matchPct)}`}
                    >
                      {formatMatchPct(bestMatch.matchPct)}
                    </div>
                  </div>

                  <p className="best-match-card__blurb">
                    {bestMatch.strengths?.trim() ||
                      "Scored by project fit, delivery ability, and budget alignment."}
                  </p>

                  {bestMatchTags.length > 0 && (
                    <div className="best-match-card__tags">
                      {bestMatchTags.map((tag) => (
                        <span key={tag} className="best-match-card__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="side-card need-help">
                <h6 className="company-name-m">
                  <i className="bi bi-shield"></i> Need help choosing?
                </h6>

                <div className="review-card">
                  <p className="review-text">
                    Independent Installer Review <br />
                    We check the quoted cost, the system size, the battery
                    option, and the savings claim against your results.
                  </p>

                  <h2 className="review-price">₦10k+</h2>
                </div>

                <button
                  type="button"
                  className="btn-orange installer-sidebar-review-btn mt-3"
                  onClick={() => {
                    void trackCtaClick("expert_review");
                    navigate(expertReviewPath);
                  }}
                >
                  Get expert review
                </button>
              </div>

              <div className="quote-card-match mb-4">
                <div className="quote-header">
                  <span className="upload-icon">
                    <img src={donw} alt="logo" />
                  </span>
                  <h6>Already have a quote?</h6>
                </div>

                <p className="quote-subtext">
                  Upload the quote you already received so SolarVy can compare
                  it to the cost and payback estimate from your results.
                </p>

                <div className="upload-box">
                  <div className="upload-inner">
                    <span className="upload-icon">
                      <img src={donw} alt="logo" />
                    </span>
                    <p className="upload-title">Upload quote</p>
                    <p className="upload-desc">PDF, image, or summary</p>
                    {quoteFileName ? (
                      <p className="upload-desc mt-1">{quoteFileName}</p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="upload-btn"
                  disabled={quoteUploading}
                  onClick={openQuoteModal}
                >
                  Upload file
                </button>

                {quoteError ? (
                  <p className="text-danger small mt-2 mb-0">{quoteError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>

      <FeedbackToast toast={toast} onClose={clearToast} />

      {quoteModalOpen ? (
        <div
          className="quote-upload-modal-overlay"
          role="presentation"
        >
          <div
            className="quote-upload-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-upload-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quote-upload-modal-header">
              <h5 id="quote-upload-modal-title">Upload installer quote</h5>
              <button
                type="button"
                className="quote-upload-modal-close"
                aria-label="Close"
                disabled={quoteUploading}
                onClick={closeQuoteModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleQuoteSubmit}>
              <div className="quote-upload-modal-body">
                <div className="mb-3">
                  <label className="form-label ass-field-label" htmlFor="quote-fullName">
                    Full Name
                  </label>
                  <input
                    id="quote-fullName"
                    type="text"
                    name="fullName"
                    value={quoteForm.fullName}
                    onChange={handleQuoteFormChange}
                    className="form-control ass-field-control"
                    placeholder="Your full name"
                    required
                    disabled={quoteUploading}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label ass-field-label" htmlFor="quote-phoneNumber">
                    Phone Number
                  </label>
                  <input
                    id="quote-phoneNumber"
                    type="tel"
                    name="phoneNumber"
                    value={quoteForm.phoneNumber}
                    onChange={handleQuoteFormChange}
                    className="form-control ass-field-control"
                    placeholder="+234..."
                    required
                    disabled={quoteUploading}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label ass-field-label" htmlFor="quote-email">
                    Email Address
                  </label>
                  <input
                    id="quote-email"
                    type="email"
                    name="email"
                    value={quoteForm.email}
                    onChange={handleQuoteFormChange}
                    className="form-control ass-field-control"
                    placeholder="name@email.com"
                    required
                    disabled={quoteUploading}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label ass-field-label" htmlFor="quote-location">
                    Location
                  </label>
                  <input
                    id="quote-location"
                    type="text"
                    name="location"
                    value={quoteForm.location}
                    onChange={handleQuoteFormChange}
                    className="form-control ass-field-control"
                    placeholder="City / State"
                    required
                    disabled={quoteUploading}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label ass-field-label" htmlFor="quote-file">
                    Upload Installer Quote
                  </label>
                  <input
                    id="quote-file"
                    ref={quoteFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                    className="form-control ass-field-control"
                    onChange={handleQuoteModalFileChange}
                    required
                    disabled={quoteUploading}
                  />
                  <p className="upload-desc mb-0 mt-1">
                    PDF, image, or document (max 15MB)
                  </p>
                </div>

                <div className="mb-3">
                  <label
                    className="form-label ass-field-label"
                    htmlFor="quote-additionalNotes"
                  >
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="quote-additionalNotes"
                    name="additionalNotes"
                    value={quoteForm.additionalNotes}
                    onChange={handleQuoteFormChange}
                    className="form-control ass-field-control"
                    rows={4}
                    placeholder="Example: I received a quote and want confirmation before proceeding"
                    disabled={quoteUploading}
                  />
                </div>

                {quoteModalError ? (
                  <p className="text-danger small mb-0">{quoteModalError}</p>
                ) : null}
              </div>

              <div className="quote-upload-modal-footer">
                <button
                  type="button"
                  className="quote-upload-modal-cancel"
                  disabled={quoteUploading}
                  onClick={closeQuoteModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="quote-upload-modal-submit"
                  disabled={quoteUploading}
                >
                  {quoteUploading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MatchedInstallers;
