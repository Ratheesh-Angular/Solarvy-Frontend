import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import sunone from "../assets/images/icon/sun.svg";
import sunthree from "../assets/images/icon/sun1.svg";
import { CheckCircle2 } from "lucide-react";
import { apiPost, ApiError } from "../lib/api";

function ExpertReview() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [fileName, setFileName] = useState("No file chosen");

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    projectLocation: "",
    reviewType: "",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName("No file chosen");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      await apiPost("/expert-review", {
        ...formData,
        attachmentFileName: fileName === "No file chosen" ? "" : fileName,
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
                    Request Expert System Review
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Upload your installer quote or project details for an
                    independent technical review by Solarvy engineers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
              <form id="expert-review-form" onSubmit={handleSubmit}>
                <div className="p-4 shadow-sm rounded-4 ass-first">
                  <div className="d-flex align-items-center mb-3">
                    <div className="step-box me-3">1</div>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Contact Information
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        How should we reach you with the review results?
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
                        placeholder="+234..."
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
                        PROJECT LOCATION
                      </label>
                      <input
                        type="text"
                        name="projectLocation"
                        value={formData.projectLocation}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        placeholder="City / State"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 shadow-sm rounded-4 ass-first mt-3">
                  <div className="d-flex align-items-center mb-3">
                    <div className="step-box me-3 expert-review-step-box">
                      2
                    </div>
                    <div>
                      <h5 className="fw-bold mb-1 heading-ass">
                        Review Details
                      </h5>
                      <p className="text-muted small mb-0 para-ass">
                        What would you like our experts to review?
                      </p>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        UPLOAD INSTALLER QUOTE (OPTIONAL)
                      </label>
                      <div className="position-relative">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="form-control ass-field-control"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                        <small
                          className="text-muted d-block mt-1"
                          style={{ fontSize: "10px" }}
                        >
                          PDF, image, or document
                        </small>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        WHAT WOULD YOU LIKE REVIEWED?
                      </label>
                      <select
                        name="reviewType"
                        value={formData.reviewType}
                        onChange={handleChange}
                        className="form-select ass-field-control"
                        required
                      >
                        <option value="">Select review type</option>
                        <option value="system-size">
                          System size recommendation
                        </option>
                        <option value="battery-sizing">Battery sizing</option>
                        <option value="installation-cost">
                          Total installation cost
                        </option>
                        <option value="payback-estimate">
                          Payback estimate
                        </option>
                        <option value="full-review">
                          Full technical review
                        </option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label ass-field-label">
                        ADDITIONAL NOTES (OPTIONAL)
                      </label>
                      <textarea
                        name="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={handleChange}
                        className="form-control ass-field-control"
                        rows={5}
                        placeholder="Example: I received a quote and want confirmation before proceeding"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="alert alert-success mt-3" role="alert">
                    Your expert review request was submitted successfully.
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
                    <span>Request Expert Review</span>
                    <span className="arrows">
                      <img src={sunthree} alt="icon" />
                    </span>
                  </button>
                </div>
              </form>
            </div>

            <div className="col-lg-4">
              <div className="p-4 rounded-4 shadow-sm right-panel assts-right  mt-3 mt-md-0">
                <h5 className="fw-bold mb-3 heading-ass">
                  What You'll Receive
                </h5>
                <p className="text-muted small mb-3 para-ass">
                  After review, our engineers will provide:
                </p>

                <ul className="review-benefits-list">
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <span>Independent system sizing validation</span>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <span>Battery configuration check</span>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <span>Cost comparison against expected range</span>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <span>Savings and payback confirmation</span>
                  </li>
                  <li className="review-benefit-item">
                    <CheckCircle2
                      size={18}
                      className="text-success me-2"
                      strokeWidth={2.5}
                    />
                    <span>Technical recommendations before installation</span>
                  </li>
                </ul>

                <div className="summary-box mt-3">
                  <div className="live-header">
                    <span className="dot"></span>
                    <span className="live-text">Expert review</span>
                  </div>

                  <p className="summary-desc">
                    Your information is used only for preparing your independent
                    assessment. We typically respond within 24-48 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="d-lg-none  px-1 mb-3">
            <button
              type="submit"
              form="expert-review-form"
              className="btn-primary-custom calu"
            >
              <span className="icon-sun">
                <img src={sunone} alt="" />
              </span>
              <span>Request Expert Review</span>
              <span className="arrows">
                <img src={sunthree} alt="" />
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExpertReview;
