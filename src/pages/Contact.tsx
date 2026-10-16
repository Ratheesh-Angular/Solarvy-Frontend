import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import sunone from "../assets/images/icon/sun.svg";
import sunthree from "../assets/images/icon/sun1.svg";
import PageSeo from "../components/PageSeo";
import Breadcrumbs from "../components/Breadcrumbs";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { apiPost, ApiError } from "../lib/api";
import "../css/static-pages.css";

const INSTALLER_NAME = "Lagos Hybrid Power Ltd";

const INITIAL_FORM = {
  fullName: "",
  phoneNumber: "",
  email: "",
  projectTimeline: "",
  additionalNotes: "",
};

const ASSESSMENT_POINTS = [
  "Estimate your energy demand and system size",
  "See indicative costs, savings and payback",
  "Compare solar and battery options before you commit",
] as const;

function Contact() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { toast, showSuccess, showError, clearToast } = useFeedbackToast();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await apiPost("/contact", formData);
      showSuccess("Your message was sent successfully.");
      setFormData(INITIAL_FORM);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Unable to send your message. Please try again.";
      setSubmitError(message);
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="static-page">
      <PageSeo
        title="Contact Us | SolarVy"
        description="Send your contact details so we can help you with your energy project."
        path="/contact"
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
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    aria-label="Toggle navigation"
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
                        <Link
                          className="nav-link"
                          to="/sample-results"
                          onClick={() => setOpen(false)}
                        >
                          Sample Results
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className="nav-link"
                          to="/who-its-for"
                          onClick={() => setOpen(false)}
                        >
                          Who It&apos;s For
                        </Link>
                      </li>
                      <li className="nav-item">
                        <button
                          className="solar-nav-btn"
                          onClick={() => navigate("/start-assessment")}
                        >
                          Start Assessment
                          <img src={bttnarrow} alt="" aria-hidden="true" />
                        </button>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>

              <div className="nav-bottom-section row align-items-center">
                <div className="col-12 col-lg-12 text-white">
                  <h1 className="bannr-text start-assesement-banner-text display-5 ass-page">
                    Request Introduction to {INSTALLER_NAME}
                  </h1>
                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Send your contact details to this selected installer so they
                    can contact you about your project.
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
              <form id="static-contact-form" onSubmit={handleSubmit}>
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="d-flex align-items-start gap-3 mb-4 rounded-3 installer-highlight-box">
                    <div className="flex-grow-1">
                      <h5 className="fw-bold mb-2 heading-ass mb-3">
                        {INSTALLER_NAME}
                      </h5>
                      <div className="d-flex flex-wrap gap-2">
                        <span className="badge bg-success ri-match-badge">
                          Match score: 82/100
                        </span>
                        <span className="badge bg-secondary ri-match-badge">
                          Lagos
                        </span>
                        <span className="badge bg-secondary ri-match-badge">
                          Home projects
                        </span>
                        <span className="badge bg-secondary ri-match-badge">
                          Good Match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <div className="step-box me-3 request-intro-step-box">1</div>
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
                    <div className="col-12">
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
                    <div className="col-12">
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
                        <option value="asap">As soon as possible</option>
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
                      />
                    </div>
                  </div>

                  <div className="static-contact-privacy" role="note">
                    <strong>Privacy notice:</strong> Your contact details will be
                    shared only with {INSTALLER_NAME} for the purpose of
                    responding to this project enquiry.
                  </div>

                  {submitError ? (
                    <div className="alert alert-danger mt-3 mb-0" role="alert">
                      {submitError}
                    </div>
                  ) : null}

                    <button
                      type="submit"
                      className="btn-primary-custom static-contact-submit"
                      disabled={isSubmitting}
                    >
                      <span className="icon-sun">
                        <img src={sunone} alt="" />
                      </span>
                      <span>{isSubmitting ? "Sending…" : "Send Message"}</span>
                      <span className="arrows">
                        <img src={sunthree} alt="" />
                      </span>
                    </button>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <aside className="static-assess-card" aria-label="Start assessment">
                <div className="static-assess-card-accent" aria-hidden="true" />
                <p className="static-assess-eyebrow">Not sure what you need?</p>
                <h5 className="static-assess-title">
                  Get a clear energy plan first
                </h5>
                <p className="static-assess-desc">
                  Run a free SolarVy assessment to understand your demand,
                  system size and options before you speak to an installer.
                </p>
                <ul className="static-assess-list">
                  {ASSESSMENT_POINTS.map((point) => (
                    <li key={point}>
                      <span className="static-assess-check" aria-hidden="true">
                        ✓
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-primary-custom static-assess-btn"
                  onClick={() => navigate("/start-assessment")}
                >
                  <span className="icon-sun">
                    <img src={sunone} alt="" />
                  </span>
                  <span>Start Assessment</span>
                  <span className="arrows">
                    <img src={sunthree} alt="" />
                  </span>
                </button>
                <p className="static-assess-note">
                  Free · Takes a few minutes · No commitment
                </p>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Contact;
