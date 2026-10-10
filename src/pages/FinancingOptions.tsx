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
  FINANCING_ROUTE_LABELS,
  formatNaira,
  formatNairaShort,
  loadFinancingRequest,
  repaymentLabel,
  toNumber,
  type FinancingPreferences,
  type FinancingRouteId,
} from "../lib/financing";

type FinancingOptionsLocationState = {
  financing?: FinancingPreferences;
};

type RouteFact = {
  label: string;
  value: string;
  icon: string;
};

type FinancingRoute = {
  id: FinancingRouteId;
  icon: string;
  badge: string;
  badgeTone: "green" | "blue";
  description: string;
  facts: RouteFact[];
  cta: string;
  featured: boolean;
};

const MISSING = "—";

const NEXT_STEPS = [
  {
    title: "Choose a financing route",
    copy: "Select the route that best matches how you would like to fund your system.",
  },
  {
    title: "Review suitable partners",
    copy: "Review suitable financing partners and their indicative requirements.",
  },
  {
    title: "Agree to send your enquiry",
    copy: "Select a provider and explicitly agree to send your enquiry.",
  },
  {
    title: "Provider checks and terms",
    copy: "The provider performs its own eligibility, credit and documentation checks and gives you its actual terms.",
  },
];

function buildRoutes(
  financing: FinancingPreferences,
  projectCost: number | null,
): FinancingRoute[] {
  const tenor = repaymentLabel(financing.repaymentPeriod) || MISSING;

  return [
    {
      id: "asset-financing",
      icon: "bi-box-seam",
      badge: "Potential match",
      badgeTone: "green",
      description:
        "Finance eligible solar and energy equipment over an agreed repayment period, subject to provider assessment and approval.",
      facts: [
        {
          label: "FINANCE REQUEST",
          value: formatNairaShort(financing.amountToFinance) || MISSING,
          icon: "bi-cash-coin",
        },
        { label: "PREFERRED TENOR", value: tenor, icon: "bi-calendar3" },
        {
          label: "STRUCTURE",
          value: "Equipment finance",
          icon: "bi-diagram-3",
        },
      ],
      cta: "View Financing Partners",
      featured: true,
    },
    {
      id: "instalment",
      icon: "bi-calendar-check",
      badge: "Explore",
      badgeTone: "blue",
      description:
        "A partner-led instalment route that may allow the project cost to be spread over time. Availability depends on the provider and project.",
      facts: [
        {
          label: "PROJECT COST",
          value: formatNairaShort(projectCost) || MISSING,
          icon: "bi-cash-stack",
        },
        {
          label: "YOUR DEPOSIT",
          value: formatNairaShort(financing.depositAvailable) || MISSING,
          icon: "bi-piggy-bank",
        },
        { label: "STRUCTURE", value: "Instalments", icon: "bi-diagram-3" },
      ],
      cta: "View Financing Partners",
      featured: false,
    },
    {
      id: "eaas",
      icon: "bi-arrow-repeat",
      badge: "May be available",
      badgeTone: "blue",
      description:
        "For qualifying projects, a provider may own or finance the system while the customer pays under a service or lease arrangement.",
      facts: [],
      cta: "Learn More",
      featured: false,
    },
  ];
}

function FinancingOptions() {
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

  const [financing] = useState<FinancingPreferences | null>(
    () =>
      (location.state as FinancingOptionsLocationState | null)?.financing ??
      loadFinancingRequest(assessmentId),
  );
  const [projectCost, setProjectCost] = useState<number | null>(null);
  const { toast, showError, clearToast } = useFeedbackToast();

  const routes = financing ? buildRoutes(financing, projectCost) : [];
  const requestSummary = financing
    ? [
        { label: "Project cost", value: formatNaira(projectCost) || MISSING },
        {
          label: "Amount to finance",
          value: formatNaira(financing.amountToFinance) || MISSING,
        },
        {
          label: "Deposit",
          value: formatNaira(financing.depositAvailable) || MISSING,
        },
        {
          label: "Preferred period",
          value: repaymentLabel(financing.repaymentPeriod) || MISSING,
        },
        { label: "Location", value: financing.location || MISSING },
      ]
    : [];

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
    }
  };

  const openRoute = (route: FinancingRouteId) => {
    navigate(withAssessment(`/financing-partners?route=${route}`), {
      state: { financing, route },
    });
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
        title="Financing Options | SolarVy"
        description="Review potential financing routes for your recommended energy system, based on your SolarVy assessment and financing preferences."
        path="/financing-options"
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
                    Your financing options
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Based on your financing preferences and energy assessment,
                    these are the financing routes that may be relevant to your
                    project.
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
                we will show the financing routes that may be relevant.
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
                      Financing check complete
                    </strong>
                    <p className="fin-status-copy">
                      We found potential routes for your project. This is an
                      initial match—not a loan approval or final financing
                      offer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="fin-section-head">
                    
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Potential financing routes
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        Compare the structure of each route before choosing
                        whether to continue.
                      </p>
                    </div>
                  </div>

                  <div className="fin-route-list">
                    {routes.map((route) => (
                      <article
                        key={route.id}
                        className={`fin-route ${route.featured ? "fin-route--featured" : ""}`}
                      >
                        {route.featured && (
                          <span className="fin-route-ribbon">
                            <i className="bi bi-stars" aria-hidden />
                            Best fit for your request
                          </span>
                        )}

                        <div className="fin-route-head">
                          <span className="fin-section-icon" aria-hidden>
                            <i className={`bi ${route.icon}`}></i>
                          </span>
                          <h6 className="fin-route-name">
                            {FINANCING_ROUTE_LABELS[route.id]}
                          </h6>
                          <span
                            className={`fin-badge ${route.badgeTone === "blue" ? "fin-badge--blue" : ""}`}
                          >
                            {route.badge}
                          </span>
                        </div>
                        <p className="fin-route-desc">{route.description}</p>

                        {route.facts.length > 0 && (
                          <div className="row g-2 fin-stats fin-route-facts">
                            {route.facts.map((fact) => (
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
                        )}

                        <div className="fin-actions fin-actions--plain">
                          <button
                            type="button"
                            className={
                              route.featured
                                ? "btn-primary-customss-down"
                                : "btn-outline-customsss2-req"
                            }
                            onClick={() => openRoute(route.id)}
                          >
                            <i
                              className={`bi ${route.id === "eaas" ? "bi-info-circle" : "bi-people"}`}
                              aria-hidden
                            />
                            <span>{route.cta}</span>
                            <i className="bi bi-arrow-right" aria-hidden />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3 mb-4">
                  <div className="fin-section-head">
                    <span className="fin-section-icon" aria-hidden>
                      <i className="bi bi-list-check"></i>
                    </span>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        What happens next?
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        SolarVy keeps you in control of when your information
                        is shared.
                      </p>
                    </div>
                  </div>

                  <ol className="fin-steps fin-steps--wide">
                    {NEXT_STEPS.map((step, index) => (
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
              </div>

              <div className="col-lg-4">
                <aside className="ri-aside">
                  <div className="ri-aside-card">
                    <div className="fin-aside-head">
                      <span className="fin-aside-icon" aria-hidden>
                        <i className="bi bi-receipt"></i>
                      </span>
                      <h5 className="ri-aside-title mb-0">Your request</h5>
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
                          navigate(withAssessment("/explore-financing"))
                        }
                      >
                        <i className="bi bi-pencil" aria-hidden />
                        <span>Edit Financing Request</span>
                      </button>
                    </div>
                  </div>

                  <div className="fin-notice" role="note">
                    <i className="bi bi-exclamation-triangle" aria-hidden />
                    <p>
                      <strong>Important:</strong> SolarVy is showing potential
                      financing routes based on the information provided.
                      Rates, monthly repayments, eligibility and approval
                      should only be shown as confirmed when supplied by the
                      relevant financing provider.
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

export default FinancingOptions;
