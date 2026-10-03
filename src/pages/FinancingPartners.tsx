import { useState, useEffect } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import { getAssessment } from "../lib/assessmentApi";
import PageSeo from "../components/PageSeo";
import Breadcrumbs from "../components/Breadcrumbs";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  FINANCING_PARTNERS,
  FINANCING_ROUTE_ICONS,
  FINANCING_ROUTE_LABELS,
  formatNaira,
  formatNairaShort,
  isFinancingRouteId,
  loadFinancingRequest,
  repaymentLabel,
  toNumber,
  type FinancingPartner,
  type FinancingPreferences,
  type FinancingRouteId,
} from "../lib/financing";

type FinancingPartnersLocationState = {
  financing?: FinancingPreferences;
};

const MISSING = "—";

function FinancingPartners() {
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
  const partners = FINANCING_PARTNERS[routeId];
  const withAssessment = (path: string) =>
    assessmentId
      ? `${path}${path.includes("?") ? "&" : "?"}assessment=${encodeURIComponent(assessmentId)}`
      : path;

  const [financing] = useState<FinancingPreferences | null>(
    () =>
      (location.state as FinancingPartnersLocationState | null)?.financing ??
      loadFinancingRequest(assessmentId),
  );
  const [projectCost, setProjectCost] = useState<number | null>(null);
  const { toast, showError, clearToast } = useFeedbackToast();

  const tenor = financing
    ? repaymentLabel(financing.repaymentPeriod) || MISSING
    : MISSING;
  const partnerFacts = financing
    ? [
        {
          label: "FINANCE REQUEST",
          value: formatNairaShort(financing.amountToFinance) || MISSING,
          icon: "bi-cash-coin",
        },
        {
          label: "TENOR RANGE",
          value: "Provider confirms",
          icon: "bi-calendar3",
        },
        {
          label: "RATE / PAYMENT",
          value: "After assessment",
          icon: "bi-percent",
        },
      ]
    : [];
  const requestSummary = financing
    ? [
        { label: "Project cost", value: formatNaira(projectCost) || MISSING },
        {
          label: "Finance requested",
          value: formatNaira(financing.amountToFinance) || MISSING,
        },
        {
          label: "Deposit",
          value: formatNaira(financing.depositAvailable) || MISSING,
        },
        { label: "Preferred period", value: tenor },
        { label: "Route", value: routeLabel },
      ]
    : [];

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const selectPartner = (partner: FinancingPartner) => {
    navigate(
      withAssessment(
        `/financing-enquiry?route=${routeId}&partner=${encodeURIComponent(partner.id)}`,
      ),
      { state: { financing, route: routeId, partner } },
    );
  };

  useEffect(() => {
    if (!assessmentId) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getAssessment(assessmentId);
        if (cancelled) return;
        setProjectCost(toNumber(data.results?.estimatedSystemCost));
      } catch {
        if (cancelled) return;
        setProjectCost(null);
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
        title="Financing Partners | SolarVy"
        description="Review financing partners that may support your selected financing route and compare their indicative requirements."
        path="/financing-partners"
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
                    Financing partners
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Review providers that may support the financing route you
                    selected. Compare their indicative requirements before
                    choosing whether to send an enquiry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          {!financing ? (
            <div className="p-4 shadow-sm rounded-4 ass-first fin-empty">
              <span className="fin-section-icon fin-empty-icon" aria-hidden>
                <i className="bi bi-clipboard-plus"></i>
              </span>
              <h5 className="fw-bold mb-1 heading-ass">
                No financing request yet
              </h5>
              <p className="text-muted small mb-0 para-ass">
                Tell us how you would like to fund your recommended system and
                we will show the financing partners that may be relevant.
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
              <div className="col-lg-8">
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="fin-card-topline">
                    <span className="fin-badge fin-badge--blue">
                      <i className={`bi ${FINANCING_ROUTE_ICONS[routeId]}`} aria-hidden />
                      {routeLabel}
                    </span>
                    {assessmentId && (
                      <span className="fin-id-chip">
                        <i className="bi bi-file-earmark-text" aria-hidden />
                        Assessment {assessmentId}
                      </span>
                    )}
                  </div>

                  <div className="fin-section-head">
                    <span className="fin-section-icon" aria-hidden>
                      <i className="bi bi-bank"></i>
                    </span>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Potential partner matches
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Compare providers that may support this route. Partner
                        details, rates and eligibility are confirmed by each
                        provider.
                      </p>
                    </div>
                  </div>

                  <div className="fin-route-list">
                    {partners.map((partner, index) => {
                      const featured = index === 0;
                      return (
                        <article
                          key={partner.id}
                          className={`fin-route ${featured ? "fin-route--featured" : ""}`}
                        >
                          {featured && (
                            <span className="fin-route-ribbon">
                              <i className="bi bi-stars" aria-hidden />
                              Closest match
                            </span>
                          )}

                          <div className="fin-route-head">
                            <span className="fin-section-icon" aria-hidden>
                              <i className="bi bi-building"></i>
                            </span>
                            <h6 className="fin-route-name">{partner.name}</h6>
                            <span className="fin-badge">Potential match</span>
                          </div>
                          <p className="fin-route-desc">
                            {partner.description}
                          </p>

                          <div className="row g-2 fin-stats fin-route-facts">
                            {partnerFacts.map((fact) => (
                              <div className="col-6 col-md-4" key={fact.label}>
                                <div className="qs-cards h-100">
                                  <div className="icon-box-right">
                                    <i
                                      className={`colo-sym-right bi ${fact.icon} text-primary fs-5`}
                                    ></i>
                                  </div>
                                  <small className="label">{fact.label}</small>
                                  <h5 className="value">{fact.value}</h5>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="fin-req">
                            <span className="fin-req-title">
                              <i className="bi bi-card-checklist" aria-hidden />
                              Indicative requirements
                            </span>
                            <ul className="fin-req-list">
                              {partner.requirements.map((item) => (
                                <li key={item}>
                                  <i className="bi bi-check2" aria-hidden />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="fin-actions fin-actions--plain">
                            <button
                              type="button"
                              className={
                                featured
                                  ? "btn-primary-customss-down"
                                  : "btn-outline-customsss2-req"
                              }
                              onClick={() => selectPartner(partner)}
                            >
                              <i className="bi bi-check2-circle" aria-hidden />
                              <span>Select Partner</span>
                              <i className="bi bi-arrow-right" aria-hidden />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3 mb-4">
                  <div className="fin-section-head">
                    <span className="fin-section-icon" aria-hidden>
                      <i className="bi bi-send-check"></i>
                    </span>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        What happens after you select?
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        You will see exactly what will be shared before
                        anything is sent.
                      </p>
                    </div>
                  </div>

                  <div className="fin-info">
                    <span className="fin-info-icon" aria-hidden>
                      <i className="bi bi-eye"></i>
                    </span>
                    <div>
                      <strong className="fin-info-title">
                        Next: Review &amp; send enquiry
                      </strong>
                      <p className="fin-info-copy">
                        You will review your contact details, financing
                        request, project summary and the assessment information
                        being shared. Nothing is sent to the selected partner
                        until you confirm.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <aside className="ri-aside">
                  <div className="ri-aside-card">
                    <div className="fin-aside-head">
                      <span className="fin-aside-icon" aria-hidden>
                        <i className="bi bi-receipt"></i>
                      </span>
                      <h5 className="ri-aside-title mb-0">
                        Your financing request
                      </h5>
                    </div>
                    <dl className="fin-summary">
                      {requestSummary.map((row) => (
                        <div className="fin-summary-row" key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="fin-actions">
                      <button
                        type="button"
                        className="btn-outline-customsss2-req"
                        onClick={() =>
                          navigate(withAssessment("/financing-options"), {
                            state: { financing },
                          })
                        }
                      >
                        <i className="bi bi-arrow-left-right" aria-hidden />
                        <span>Change Financing Route</span>
                      </button>
                    </div>
                  </div>

                  <div className="fin-notice" role="note">
                    <i className="bi bi-exclamation-triangle" aria-hidden />
                    <p>
                      <strong>No guaranteed approval.</strong> Providers are
                      never shown as approved, and rates or repayments only
                      appear once the provider confirms them.
                    </p>
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

export default FinancingPartners;
