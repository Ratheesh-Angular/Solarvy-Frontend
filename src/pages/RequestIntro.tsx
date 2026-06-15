import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import sunone from "../assets/images/icon/sun.svg";
import sunthree from "../assets/images/icon/sun1.svg";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { apiPost, ApiError } from "../lib/api";

const PROJECT_SUMMARY_DATA = [
  { label: "Location", value: "Lagos" },
  { label: "Project type", value: "Small business" },
  { label: "Estimated size", value: "15–25 kWp" },
  { label: "Budget range", value: "₦18m–₦24m" },
] as const;

function RequestIntro() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    projectTimeline: "",
    additionalNotes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
    setSubmitSuccess(false);

    try {
      await apiPost("/request-intro", {
        ...formData,
        projectSummary: PROJECT_SUMMARY_DATA,
      });
      setSubmitSuccess(true);
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
                          onClick={() => navigate("/start-assesement")}
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
                    Request Introduction to PrimeVolt Energy
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
                        PrimeVolt Energy
                      </h5>
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge bg-success">
                          Match score: 82/100
                        </span>
                        <span className="badge bg-secondary">Lagos</span>
                        <span className="badge bg-secondary">SME fit</span>
                        <span className="badge bg-secondary">
                          Solar + battery
                        </span>
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

                {submitSuccess && (
                  <div className="alert alert-success mt-3" role="alert">
                    Your introduction request was submitted successfully.
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
                    onClick={() => navigate("/matched-installers")}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <div className="p-4 rounded-4 shadow-sm right-panel assts-right mt-4 mt-md-0">
                <h5 className="fw-bold mb-2 heading-ass">Project Summary</h5>
                <p className="text-muted small mb-3 para-ass">
                  This is the project information already carried over from your
                  Solarvy results.
                </p>

                <div className="row g-2">
                  {PROJECT_SUMMARY_DATA.map((item) => (
                    <div className="col-6" key={item.label}>
                      <div className="project-summary-mini-card">
                        <div className="project-summary-label">
                          {item.label}
                        </div>
                        <div className="project-summary-value">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-4 shadow-sm right-panel assts-right mt-4 ">
                <h5 className="fw-bold mb-3 heading-ass">Why This Works</h5>

                <ul className="review-benefits-list">
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <div>
                      <strong>Selected installer only</strong>
                      <div className="small text-muted">
                        Your request is tied to the installer you chose.
                      </div>
                    </div>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <div>
                      <strong>No repeated assessment</strong>
                      <div className="small text-muted">
                        You do not need to enter all your project details again.
                      </div>
                    </div>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <div>
                      <strong>Easy next step</strong>
                      <div className="small text-muted">
                        Just send your contact details and move forward.
                      </div>
                    </div>
                  </li>
                </ul>

                <div className="request-intro-sidebar-back-link-wrap">
                  <Link
                    to="/matched-installers"
                    className="request-intro-back-link"
                  >
                    <ArrowLeft size={14} strokeWidth={2} aria-hidden />
                    Back to matched installers
                  </Link>
                </div>
              </div>
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
              onClick={() => navigate("/matched-installers")}
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
