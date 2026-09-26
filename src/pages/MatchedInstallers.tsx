import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import donw from "../assets/images/icon/d11.svg";
import "../css/MatchedInstallers.css";
import PageSeo from "../components/PageSeo";
import FeedbackToast from "../components/FeedbackToast";
import QuoteUploadModal from "../components/QuoteUploadModal";
import SolarvyLoader from "../components/SolarvyLoader";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { getAssessment } from "../lib/assessmentApi";
import type { AssessmentResults } from "../types/assessment";
import { trackCtaClick, trackEvent } from "../lib/visitorTracking";

type SnapshotItem = { label: string; value: string };

type MatchedInstallersLocationState = {
  from?: "assessment-result" | "expert-review" | "request-intro";
};

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const assessmentId = searchParams.get("assessment");
  const shouldOpenQuoteUpload = searchParams.get("upload") === "quote";
  const fromPage = (location.state as MatchedInstallersLocationState | null)
    ?.from;

  const backLabel =
    fromPage === "expert-review"
      ? "Back to Expert Review"
      : fromPage === "request-intro"
        ? "Back to Request Introduction"
        : assessmentId || fromPage === "assessment-result"
          ? "Back to Assessment Results"
          : "Back to Home";

  const backPath =
    fromPage === "expert-review"
      ? assessmentId
        ? `/expert-review?assessment=${encodeURIComponent(assessmentId)}`
        : "/expert-review"
      : fromPage === "request-intro"
        ? assessmentId
          ? `/request-intro?assessment=${encodeURIComponent(assessmentId)}`
          : "/request-intro"
        : assessmentId || fromPage === "assessment-result"
          ? assessmentId
            ? `/assessment-result?assessment=${encodeURIComponent(assessmentId)}`
            : "/assessment-result"
          : "/";

  const [scrolled, setScrolled] = useState(false);
  const [installers, setInstallers] =
    useState<readonly InstallerMatch[]>(MOCK_INSTALLERS);
  const [projectSummary, setProjectSummary] = useState<readonly SnapshotItem[]>(
    DEFAULT_PROJECT_SUMMARY,
  );
  const [isLoading, setIsLoading] = useState(Boolean(assessmentId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteFileName, setQuoteFileName] = useState("");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const { toast, showSuccess, clearToast } = useFeedbackToast();

  const expertReviewPath = assessmentId
    ? `/expert-review?assessment=${encodeURIComponent(assessmentId)}`
    : "/expert-review";

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const openQuoteModal = () => {
    void trackCtaClick("quote_upload", {
      entityType: assessmentId ? "assessment" : "",
      entityId: assessmentId || undefined,
    });
    setQuoteError(null);
    setQuoteModalOpen(true);
  };

  useEffect(() => {
    if (!shouldOpenQuoteUpload) return;

    openQuoteModal();

    const next = new URLSearchParams(searchParams);
    next.delete("upload");
    setSearchParams(next, { replace: true });
    // Open once when landing with upload=quote; strip param so refresh does not re-open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldOpenQuoteUpload]);

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
      <SolarvyLoader
        open={isLoading}
        message="Loading matched installers..."
      />
      <div className="full-body-color">
        <section className="hero d-flex align-items-center ass-bannr matched-installers-hero py-4">
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

                  <p className="bannr-text-s text-light mt-2 mb-2 ass-page-two">
                    These installers match your project using your location,
                    system size, project cost, and the savings and payback
                    calculated from your results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 px-3 matched-installers-list">
          <div className="row align-items-start">
            <div className="col-lg-8 ">
              <div className="matched-installers-list__header">
                <h5 className="title-main mb-0">Installer shortlist</h5>
                <div className="matched-installers-list__meta-row">
                  <p className="sub-text mb-0 mobile-view-match">
                    Matched to your size, cost, timing, and energy setup
                  </p>
                  {!isLoading && (
                    <div className="result-badge">{resultCountLabel}</div>
                  )}
                </div>
              </div>

              {loadError && (
                <p className="installer-load-note mb-3" role="status">
                  {loadError}
                </p>
              )}

              {isLoading &&
                Array.from({ length: 3 }, (_, i) => (
                  <article
                    key={`installer-skeleton-${i}`}
                    className="installer-card installer-dossier installer-card--skeleton"
                    aria-hidden
                  >
                    <div className="installer-dossier__body">
                      <div className="installer-dossier__top">
                        <span className="installer-skeleton-bar installer-skeleton-bar--eyebrow" />
                        <span className="installer-skeleton-block installer-skeleton-block--score" />
                      </div>
                      <span className="installer-skeleton-bar installer-skeleton-bar--name" />
                      <span className="installer-skeleton-bar installer-skeleton-bar--subtitle" />
                      <div className="installer-chip-row">
                        <span className="installer-skeleton-bar installer-skeleton-bar--chip" />
                        <span className="installer-skeleton-bar installer-skeleton-bar--chip" />
                      </div>
                      <div className="installer-skeleton-meta">
                        <span className="installer-skeleton-bar installer-skeleton-bar--meta" />
                        <span className="installer-skeleton-bar installer-skeleton-bar--meta-short" />
                      </div>
                      <div className="installer-dossier__actions">
                        <span className="installer-skeleton-bar installer-skeleton-bar--cta" />
                        <span className="installer-skeleton-bar installer-skeleton-bar--cta-secondary" />
                      </div>
                    </div>
                  </article>
                ))}

              {!isLoading &&
                installers.map((installer, index) => {
                  const accent = matchScoreAccent(installer.matchPct);
                  const rank = installer.cardNumber ?? index + 1;
                  const primaryLabel =
                    installer.primaryCta?.trim() || "Request Introduction";
                  const secondaryLabel =
                    installer.secondaryCta?.trim() || "Get Expert Review";
                  const coverageLabel = installer.coverage
                    ?.replace(/;/g, ",")
                    .trim();
                  const suitedFor = installer.bestSuitedFor?.trim();
                  const subtitleParts = [coverageLabel, suitedFor].filter(
                    Boolean,
                  );
                  const strengthItems = (installer.strengths ?? "")
                    .split(";")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const strengthsSentence = strengthItems.length
                    ? (() => {
                        const joined = strengthItems.join(", ");
                        const text =
                          joined.charAt(0).toUpperCase() + joined.slice(1);
                        return /[.!?]$/.test(text) ? text : `${text}.`;
                      })()
                    : "";

                  return (
                    <article
                      key={`${installer.installerName}-${rank}`}
                      className={`installer-card installer-dossier match-accent--${accent}`}
                    >
                      <div className="installer-dossier__body">
                        <div className="installer-dossier__top">
                          <p className="installer-dossier__eyebrow">
                            #{rank}
                            {installer.matchTier
                              ? ` · ${installer.matchTier}`
                              : ""}
                          </p>
                          <div
                            className={`installer-match-pct ${matchScoreAccentClass(installer.matchPct)}`}
                          >
                            {formatMatchPct(installer.matchPct)}
                          </div>
                        </div>

                        <h6 className="installer-dossier__name">
                          {installer.installerName}
                        </h6>

                        {subtitleParts.length > 0 && (
                          <p className="installer-dossier__subtitle">
                            {subtitleParts.join(" · ")}
                          </p>
                        )}

                        {(installer.pricing || installer.response) && (
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
                        )}

                        {strengthsSentence && (
                          <p className="installer-dossier__summary">
                            {strengthsSentence}
                          </p>
                        )}

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
                            state={{ from: "matched-installers" }}
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
                    </article>
                  );
                })}
            </div>

            <div className="col-lg-4">
              <div
                className={`match-snapshot mb-4${snapshotOpen ? " is-expanded" : ""}`}
                role="region"
                aria-labelledby="match-snapshot-heading"
              >
                <button
                  type="button"
                  className="match-snapshot__toggle"
                  aria-expanded={snapshotOpen}
                  aria-controls="match-snapshot-list"
                  onClick={() => setSnapshotOpen((v) => !v)}
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
                  <i
                    className="bi bi-chevron-down match-snapshot__chevron"
                    aria-hidden="true"
                  />
                </button>
                <ul id="match-snapshot-list" className="match-snapshot__list">
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
                    navigate(expertReviewPath, {
                      state: { from: "matched-installers" },
                    });
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
                  onClick={openQuoteModal}
                >
                  Upload file
                </button>

                <button
                  type="button"
                  className="upload-btn mt-2"
                  onClick={() => navigate(backPath)}
                >
                  <i className="bi bi-arrow-left" aria-hidden />
                  <span>{backLabel}</span>
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

      <QuoteUploadModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        assessmentId={assessmentId || undefined}
        onSuccess={(fileName) => {
          setQuoteFileName(fileName);
          setQuoteError(null);
          showSuccess(
            "Quote uploaded successfully. Our team can use it for comparison.",
          );
        }}
      />
    </div>
  );
}

export default MatchedInstallers;
