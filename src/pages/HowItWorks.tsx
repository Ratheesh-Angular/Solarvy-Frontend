import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import "bootstrap/dist/css/bootstrap.min.css";

import Sun from "../assets/images/icon/sun-red.svg";
import halfSun from "../assets/images/icon/half-s.svg";
import batt from "../assets/images/icon/batt.svg";
import money from "../assets/images/icon/money-bag.svg";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function HowItWorks() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const handleToggle = () => {
    setOpen(!open);
  };

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
      <div className="full-body-color">
        <section className="hero d-flex align-items-center ass-bannr ">
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
              <div className="nav-bottom-section row align-items-center home-page">
                <div className="col-12 col-lg-12 text-white ">
                  <h1 className="bannr-text display-5 ass-page how-it-works-banner-text">
                    Get a tailored energy solution in minutes
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Solarvy turns your bill, appliance data, or custom equipment
                    inputs into a clear energy plan. It combines technical and
                    financial logic so users can understand what system they
                    need and what value it is likely to deliver.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="row align-items-start">
            <div className="col-lg-12">
              <div className="first-secion ">
                <div className="process-section text-center">
                  <h2 className="process-title">The Process</h2>
                  <p className="process-subtitle">
                    Understand the full journey at a glance — from your first
                    input to a clear energy plan.
                  </p>
                </div>

                <div className="row g-3 ">
                  <div className="container ">
                    <div className="row py-4 g-4">
                      <div className="col-md-3">
                        <div className="next-card text-center text-md-start">
                          <div className="d-flex align-items-center mb-3">
                            <div className="step-box-how me-3">1</div>
                          </div>

                          <div className="card-content ">
                            <h6 className="title-cardss">
                              <strong className="rang-heads">
                                Enter your details
                              </strong>
                            </h6>

                            <p className="desc mt-1">
                              Provide your location, electricity bill,
                              appliances, or custom equipment so Solarvy
                              understands your building and energy usage.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="next-card text-center text-md-start">
                          <div className="d-flex align-items-center mb-3">
                            <div className="step-box-how me-3">2</div>
                          </div>

                          <div className="card-content">
                            <h6 className="title-cardss">
                              <strong className="rang-heads">
                                Analyse the energy environment
                              </strong>
                            </h6>

                            <p className="desc">
                              Solarvy models demand, local solar potential,
                              system performance, and the likely cost
                              implications of different energy paths.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="next-card text-center text-md-start">
                          <div className="d-flex align-items-center mb-3">
                            <div className="step-box-how me-3">3</div>
                          </div>

                          <div className="card-content">
                            <h6 className="title-cardss">
                              <strong className="rang-heads">
                                Compare system options
                              </strong>
                            </h6>

                            <p className="desc">
                              See practical strategy paths such as solar + grid,
                              solar + battery, or hybrid setups with generator
                              support where needed.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-3">
                        <div className="next-card text-center text-md-start">
                          <div className="d-flex align-items-center mb-3">
                            <div className="step-box-how me-3">4</div>
                          </div>

                          <div className="card-content">
                            <h6 className="title-cardss">
                              <strong className="rang-heads">
                                Get your plan
                              </strong>
                            </h6>

                            <p className="desc">
                              Receive system sizing, indicative cost, savings,
                              payback, and next steps including report download
                              or installer quotes.{" "}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="process-section text-center">
                    <h2 className="process-title">
                      What happens behind the scenes
                    </h2>
                    <p className="process-subtitle">
                      Powerful modelling and financial logic work together to
                      deliver actionable results.
                    </p>
                  </div>
                  <div className="row g-4 align-items-stretch how-behind-scenes-row">
                    <div className="col-12 col-md-6">
                      <div className="shadow-sm rounded-4 ass-first mt-4 how-behind-scenes-card">
                        <div className="icon-box-maony me-3 mb-3">
                          <img src={money} alt="icon" />
                        </div>
                        <div>
                          <h5 className="fw-bold mb-2 rang-head">
                            Technical modelling Financial Summary
                          </h5>
                          <small className="text-muted">
                            Solarvy uses structured energy logic to estimate
                            system size, expected generation, battery support,
                            and performance under real operating conditions.
                          </small>
                        </div>
                        <div className="feature-list">
                          <div className="feature-item">
                            <span className="dot-blue"></span>
                            <span className="dots-texts">
                              Bill-based or appliance-based estimation
                            </span>
                          </div>

                          <div className="feature-item">
                            <span className="dot-blue"></span>
                            <span className="dots-texts">
                              Solar and hybrid system sizing
                            </span>
                          </div>

                          <div className="feature-item">
                            <span className="dot-blue"></span>
                            <span className="dots-texts">
                              Simple energy strategy comparison
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="shadow-sm rounded-4 ass-first mt-4 how-behind-scenes-card">
                        <div className="icon-box-maony me-3 mb-3">
                          <img src={money} alt="icon" />
                        </div>
                        <div>
                          <h5 className="fw-bold mb-2 rang-head">
                            Financial outputs
                          </h5>
                          <small className="text-muted">
                            The platform translates technical results into
                            decision-friendly outputs so users can understand
                            whether a solution is <br />
                            commercially attractive.
                          </small>
                        </div>
                        <div className="feature-list-orange">
                          <div className="feature-item">
                            <span className="dot-orange"></span>
                            <span className="dots-texts">
                              Indicative system cost
                            </span>
                          </div>

                          <div className="feature-item">
                            <span className="dot-orange"></span>
                            <span className="dots-texts">
                              Estimated savings
                            </span>
                          </div>

                          <div className="feature-item">
                            <span className="dot-orange"></span>
                            <span className="dots-texts">
                              Simple payback and value indicators
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="process-section text-center mt-4">
                  <h2 className="process-title">
                    Built for real-world energy conditions
                  </h2>
                  <p className="process-subtitle">
                    Solarvy is not just another basic solar calculator — it's
                    designed for the realities of West African energy.
                  </p>
                </div>

                <div className="row d-flex  mb-5">
                  <div className="col-12 col-md-4">
                    <div
                      className="p-4 shadow-sm rounded-4 ass-first mt-4"
                      style={{ height: "220px" }}
                    >
                      <div className="icon-box-sun mb-3">
                        <img src={Sun} alt="icon" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-2 rang-head">
                          Grid + generator + solar
                        </h5>
                        <small className="text-muted">
                          Designed for environments where power is not always
                          stable and hybrid systems are a practical
                          necessity.{" "}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div
                      className="p-4 shadow-sm rounded-4 ass-first mt-4"
                      style={{ height: "220px" }}
                    >
                      <div className="icon-box-battery mb-3">
                        <img src={batt} alt="icon" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-2 rang-head">
                          Homes and businesses
                        </h5>
                        <small className="text-muted">
                          Useful for residential users, SMEs, and facilities
                          with more demanding energy and reliability needs.
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-4">
                    <div
                      className="p-4 shadow-sm rounded-4 ass-first mt-4"
                      style={{ height: "220px" }}
                    >
                      <div className="icon-box-act mb-3">
                        <img src={halfSun} alt="icon" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-2 rang-head">
                          Clear decision support
                        </h5>
                        <small className="text-muted">
                          Moves beyond simple panel-counting to show practical
                          options, cost implications, and next steps.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HowItWorks;
