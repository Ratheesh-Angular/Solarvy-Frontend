import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import "bootstrap/dist/css/bootstrap.min.css";

import buletwo from "../assets/images/icon/bule2.svg";

import money from "../assets/images/icon/money-bag.svg";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
function SampleResults() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setOpen(!open);
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
              <div className="nav-bottom-section row align-items-center">
                <div className="col-12 col-lg-12 text-white ">
                  <h1 className="bannr-text display-5 ass-page sample-results-banner-text">
                    See what you'll get
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    This page shows the kind of output Solarvy can generate
                    after a user completes the assessment. It should make the
                    product feel real, practical, and worth trying.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-3 px-lg-4 sample-page-section">
          <div className="row g-4 align-items-start">
            <div className="col-lg-6">
              <div className="p-4 shadow-sm rounded-4 ass-first">
                <div className="d-flex align-items-center mb-2">
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">
                      Example project summary
                    </h5>
                  </div>
                </div>

                <div className="row">
                  <div className="">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Location</span>
                      <strong className="rang-head">Lagos, Nigeria</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Property type</span>
                      <strong className="rang-head">Hotel</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Monthly energy use</span>
                      <strong className="rang-head">18,000 kWh</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Objective</span>
                      <strong className="rang-head">Reduce diesel use</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between border-0">
                      <span className="rang-name">Current setup</span>
                      <strong className="rang-head">Grid + Generator</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="p-4 shadow-sm rounded-4 ass-first">
                <div className="d-flex align-items-center mb-2">
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">
                      Recommended system
                    </h5>
                  </div>
                </div>

                <div className="row">
                  <div className="">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Optimal strategy</span>
                      <strong className="rang-head">
                        Hybrid solar + battery
                      </strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Solar PV</span>
                      <strong className="rang-head">28 kWp</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Battery</span>
                      <strong className="rang-head">40 kWh</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Inverter</span>
                      <strong className="rang-head">25 kW hybrid</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between border-0">
                      <span className="rang-name">Status</span>
                      <div className="d-inline-block">
                        <span className="badge recommended-badge px-3 py-2">
                          Recommended
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-3 px-lg-4 sample-page-section">
          <div className="row g-4 align-items-start">
            <div className="col-12 dashboard-container">
              <h2 className="dashboard-title">Result dashboard</h2>
              <p className="dashboard-subtitle">
                A simple overview of your system size, costs, savings, and
                expected impact.
              </p>
            </div>

            <div className="col-12">
              <div className="">
                <div className="row g-3">
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="dashboard-card">
                      <p className="card-title">ESTIMATED COST</p>
                      <h3 className="card-value">NGN 32m</h3>
                      <p className="card-sub">Indicative system cost</p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="dashboard-card">
                      <p className="card-title">ANNUAL SAVINGS</p>
                      <h3 className="card-value">NGN 7.8m</h3>
                      <p className="card-sub">Indicative</p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="dashboard-card">
                      <p className="card-title">PAYBACK</p>
                      <h3 className="card-value">4.2 yrs</h3>
                      <p className="card-sub">Simple payback</p>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="dashboard-card">
                      <p className="card-title">DIESEL REDUCTION</p>
                      <h3 className="card-value">60%</h3>
                      <p className="card-sub">Estimated</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-3 px-lg-4 sample-page-section">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-6 d-flex mt-0">
              <div className="p-4 shadow-sm rounded-4 ass-first mt-0 w-100 h-100">
                <div className="d-flex align-items-center mb-4">
                  <div>
                    <h5 className="fw-bold mb-1 rang-head">Energy mix</h5>
                    <small className="text-muted">
                      This shows how solar, grid, and generator power work
                      together to supply your energy.
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-12  mt-0 mt-md-0">
                    <h6 className="left-rang fw-bold mb-3">% Energy Impact</h6>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between">
                        <span className="rang-name">Solar contribution</span>
                        <strong className="per-rang">62%</strong>
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
                        <span className="rang-name">Grid contribution</span>
                        <strong className="per-rang">23%</strong>
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
                        <span className="rang-name">
                          Generator contribution
                        </span>
                        <strong className="per-rang">15%</strong>
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
            </div>
            <div className="col-lg-6 d-flex mt-0">
              <div className="p-4 shadow-sm rounded-4 ass-first  w-100 h-100 financial-summary-title">
                <div className="d-flex align-items-center mb-2">
                  <div>
                    <h5 className="fw-bold mb-1 rang-head ">
                      Financial summary
                    </h5>
                    <small className="text-muted">
                      See how your energy costs change with the recommended
                      setup.
                    </small>
                  </div>
                </div>

                <div className="row">
                  <div className="">
                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">
                        Current annual energy cost
                      </span>
                      <strong className="rang-head">NGN 14.0m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">
                        Projected annual energy cost
                      </span>
                      <strong className="rang-head">NGN 7.0m</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Expected PV generation</span>
                      <strong className="rang-head">42,500 kWh/year</strong>
                    </div>

                    <div className="summary-row d-flex justify-content-between">
                      <span className="rang-name">Reliability improvement</span>
                      <strong className="rang-head">High</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-3 px-lg-4 sample-page-section">
          <div className="row align-items-start g-4">
            <div className="col-12 dashboard-container">
              <h2 className="dashboard-title">Energy strategy comparison</h2>
              <p className="dashboard-subtitle">
                This helps you quickly your options and see which one gives you
                the best
                <br />
                results.
              </p>
            </div>

            <div className="col-12">
              <div className="custom-table">
                <table>
                  <thead>
                    <tr>
                      <th>STRATEGY</th>
                      <th>ANNUAL COST</th>
                      <th>RELIABILITY</th>
                      <th>DIESEL USE</th>
                      <th>PAYBACK</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>Grid Only</td>
                      <td>NGN 12.0m</td>
                      <td>Medium</td>
                      <td>Low</td>
                      <td>—</td>
                    </tr>

                    <tr>
                      <td>Grid + Generator</td>
                      <td>NGN 14.0m</td>
                      <td>High</td>
                      <td>High</td>
                      <td>—</td>
                    </tr>

                    <tr>
                      <td>Solar + Grid</td>
                      <td>NGN 9.0m</td>
                      <td>Medium</td>
                      <td>Medium</td>
                      <td>5.2 yrs</td>
                    </tr>

                    <tr className="recommended-row">
                      <td className="text-color-b title-cell">
                        <span className="title-text">
                          Solar + Battery + Generator
                        </span>
                        <span className="badge-recommended">Recommended</span>
                      </td>

                      <td className="text-color-b">NGN 7.0m</td>
                      <td className="strong text-color-b">Very High</td>
                      <td className="strong text-color-b">Very Low</td>
                      <td className="strong text-color-b">4.2 yrs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SampleResults;
