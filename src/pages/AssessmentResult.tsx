import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import "bootstrap/dist/css/bootstrap.min.css";

import buletwo from "../assets/images/icon/bule2.svg";

import Sun from "../assets/images/icon/sun-red.svg";
import halfSun from "../assets/images/icon/half-s.svg";
import batt from "../assets/images/icon/batt.svg";
import money from "../assets/images/icon/money-bag.svg";
import imp from "../assets/images/icon/imporent.svg";
import donw from "../assets/images/icon/d11.svg";
import save from "../assets/images/icon/saves.svg";
import qut from "../assets/images/icon/qut.svg";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import whitearrow from "../assets/images/icon/w-arror.svg";

import { Battery } from "lucide-react";

function AssesementResult() {
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
                  <h1 className="bannr-text display-5 ass-page ass-result-banner-text">
                    Your preliminary energy system recommendation
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
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
          <div className="row g-4 align-items-start">
            <div className="col-lg-8">
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
                        5.8 <span className="fs-5 sun-sub">kWp</span>
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
                        12.0 <span className="fs-5 sun-sub">kWh</span>
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
                      <div className="d-flex align-items-center justify-content-between mb-2 gap-2">
                        <div className="icon-box-act">
                          <img src={halfSun} alt="icon" />
                        </div>
                        <small className="text-uppercase text-muted">
                          <b>Recommended Inverter</b>
                        </small>

                        <div className="download-icon-mobile">
                          <img src={donw} alt="logo" />
                        </div>
                      </div>

                      <h2 className="fw-bold sun-head">
                        5.0 <span className="fs-5 sun-sub">kWh</span>
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

              <div className="p-4 shadow-sm rounded-4 ass-resul-first mt-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="icon-box-maony me-3">
                    <img src={money} alt="icon" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">
                      Financial Summary
                    </h5>
                    <small className="text-muted">
                      Understand the commercial side quickly, without technical
                      jargon.
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 border-end">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Estimated system cost</span>
                      <strong className="rang-head">N7.8m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Gross annual savings</span>
                      <strong className="rang-head">N2.0m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Annual O&M allowance</span>
                      <strong className="rang-head">N0.2m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Net annual savings</span>
                      <strong className="rang-head">N1.8m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between border-0">
                      <span className="rang-name">Simple payback</span>
                      <strong className="rang-head">4.3 years</strong>
                    </div>
                  </div>

                  <div className="col-md-6 ps-md-4 mt-4 mt-md-0">
                    <h6 className="left-rang fw-bold mb-3">% Energy Impact</h6>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Solar share</span>
                        <strong className="per-rang">68%</strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-danger"
                          style={{ width: "68%" }}
                        ></div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Grid offset</span>
                        <strong className="per-rang">42%</strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-primary"
                          style={{ width: "42%" }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Diesel reduction</span>
                        <strong className="per-rang">57%</strong>
                      </div>
                      <div className="progress custom-progress">
                        <div
                          className="progress-bar bg-success"
                          style={{ width: "57%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 shadow-sm rounded-4 ass-first mt-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="icon-box-maony-two me-3">
                    <img src={buletwo} alt="icon" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">
                      System Detail Breakdown
                    </h5>
                    <small className="text-muted">
                      Understand why this recommendation was generated and the
                      key technical parameters.
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Estimated system cost</span>
                      <strong className="rang-head">N7.8m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Gross annual savings</span>
                      <strong className="rang-head">N2.0m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Annual O&M allowance</span>
                      <strong className="rang-head">N0.2m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Net annual savings</span>
                      <strong className="rang-head">N1.8m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between border-0">
                      <span className="rang-name">Simple payback</span>
                      <strong className="rang-head">4.3 years</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="important-note d-flex align-items-start p-3 mt-4">
                <div className="me-2 mt-1">
                  <img src={imp} alt="icon" />
                </div>

                <div>
                  <span className="fw-bold">Important note:</span> These results
                  are indicative only. Final system design, procurement, and
                  performance should be validated through a detailed review
                  before investment or installation.
                </div>
              </div>

              <div className="p-4 shadow-sm rounded-4 ass-first mt-4 mb-4">
                <div className="d-flex align-items-start mb-3">
                  <div className="next-icon me-3">
                    <img src={whitearrow} alt="arrow" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">
                      What Happens Next
                    </h5>
                    <small className="text-muted sub-down">
                      The best results don’t stop at numbers. Move forward with
                      a clear next step.
                    </small>
                  </div>
                </div>

                <div
                  className="container my-4"
                  style={{ marginLeft: 0, paddingLeft: 0 }}
                >
                  <div className="row g-4">
                    <div className="col-12 col-md-4">
                      <div className="info-card ms-0">
                        <div className="info-badge">1</div>
                        <h6 className="info-title">
                          <i className="bi bi-download me-2"></i>
                          Download your report
                        </h6>
                        <p className="info-text">
                          Send a PDF summary by email with the recommended
                          system, savings, and payback period.
                        </p>
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="info-card">
                        <div className="info-badge">2</div>
                        <h6 className="info-title">
                          <i className="bi bi-people me-2"></i>
                          View installer quotes
                        </h6>
                        <p className="info-text">
                          Use the result to match you with installers suited to
                          the location and system size.
                        </p>
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="info-card">
                        <div className="info-badge">3</div>
                        <h6 className="info-title">
                          <i className="bi bi-bar-chart me-2"></i>
                          Upgrade to expert review
                        </h6>
                        <p className="info-text">
                          For more confidence before investment, route into a
                          deeper technical review with our advisory team.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="button-group mt-3">
                  <button className="btn-primary-customss-down">
                    <span className="icon-get">
                      <img src={donw} alt="logo" />
                    </span>
                    <span>Download Report</span>
                  </button>

                  <button
                    type="button"
                    className="btn-outline-customsss2-req"
                    onClick={() => navigate("/matched-installers")}
                  >
                    <span className="icon-get">
                      <img src={save} alt="icon" />
                    </span>
                    <span>View Installer Quotes</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="p-4 rounded-4 shadow-sm right-panel assts-right">
                <div className="d-flex align-items-center mb-3">
                  <div className="qs-icon me-2">
                    <img src={qut} alt="icon" />
                  </div>
                  <h6 className="qt-text fw-bold mb-0">Quick Snapshot</h6>
                </div>

                <hr className="liness" />

                <div className="row g-3">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="qs-cards">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-graph-up text-primary fs-5"></i>
                        </div>
                        <small className="label">ANNUAL SAVINGS</small>
                        <h5 className="value">N1.8M</h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-clock-history text-primary fs-5"></i>
                        </div>
                        <small className="label">PAYBACK</small>
                        <h5 className="value">4.3yrs</h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-fire text-primary fs-5"></i>
                        </div>
                        <small className="label">DIESEL SAVED</small>
                        <h5 className="value">2,150L</h5>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="qs-cards">
                        <div className="icon-box-right">
                          <i className="colo-sym-right bi bi-stack text-primary fs-5"></i>
                        </div>
                        <small className="label">SYSTEM CLASS</small>
                        <h5 className="value">Hybrid</h5>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="d-flex align-items-start mb-3">
                    <div className="info-icon-box me-3">
                      <i className="bi bi-file-earmark-text"></i>
                    </div>
                    <div>
                      <div className="det-text fw-semibold info-title">
                        Detailed technical review
                      </div>
                      <small className="text-muted info-desc">
                        Best for hotels, hospitals, factories, estates, and
                        higher-value projects.
                      </small>
                    </div>
                  </div>

                  <div className="d-flex align-items-start mb-4">
                    <div className="info-icon-box me-3">
                      <i className="bi bi-people"></i>
                    </div>
                    <div>
                      <div className="det-text fw-semibold info-title">
                        Installer matching
                      </div>
                      <small className="text-muted info-desc">
                        Best for users ready to compare implementation options
                        immediately.
                      </small>
                    </div>
                  </div>
                </div>

                <button
                  className="btn-primary-customss"
                  style={{ height: "45px" }}
                >
                  <span className="icon-get">
                    <i className="whit-icon bi bi-file-earmark-text"></i>
                  </span>
                  <span>Get Detailed Review</span>
                  <span className="arrows">
                    <img src={save} alt="icon" />
                  </span>
                </button>

                <button
                  className="btn-outline-customss2 "
                  style={{ height: "45px" }}
                  onClick={() => navigate("/start-assesement")}
                >
                  <span className="icon-get">
                    <i className="bi bi-arrow-left"></i>
                  </span>
                  <span>Back to Assessment</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AssesementResult;
