import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import "bootstrap/dist/css/bootstrap.min.css";

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
function WhoItsFor() {
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

            <nav className={`navbar navbar-expand-lg  ${scrolled ? "scrolled" : ""}`}>

              <Link className="navbar-brand" to="/">
                <img
                  src={logo}
                  alt="logo"
                  className="solar-logo-img"
                />
              </Link>

 <button
  className="navbar-toggler"
  type="button"
  onClick={handleToggle}
>
  <span className="navbar-toggler-icon"></span>
</button>

         <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>

                <ul className="navbar-nav ms-auto align-items-lg-center solar-nav-links">

                  <li className="nav-item">
              <Link className="nav-link" to="/how-it-works" onClick={() => setOpen(false)}>
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

                      <img
                        src={bttnarrow}
                        alt="arrow"
                      />

                    </button>

                  </li>

                </ul>

              </div>

            </nav>

          </div>
              <div className="nav-bottom-section row align-items-center home-page">
                <div className="col-12 col-lg-12 text-white ">
                  <h1 className="bannr-text display-5 ass-page ">
                    Built for real energy users, not just <br />
                    one type of customer
                  </h1>

                  <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two">
                    Solarvy is designed for people and organisations dealing
                    with real energy decisions — from households planning backup
                    power to businesses trying to reduce diesel use and
                    facilities that need stronger reliability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-4">
          <div className="row g-4 align-items-start">
            <div className="dashboard-container">
              <h2 className="dashboard-title">Who uses Solarvy</h2>
              <p className="dashboard-subtitle">
                A quick way to see if Solarvy is built for someone like you.
              </p>
            </div>

            <div className="container my-2">
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-3">
                  <div className="custom-card h-100">
                    <div className="icon-box-who">
                      <i className="bi bi-house"></i>
                    </div>
                    <h5 className="fw-bold mb-1 rang-head mt-3">Homes</h5>
                    <p className="text-muted small">
                      For households that want to reduce bills, improve backup
                      during outages, or understand the right solar and battery
                      size.
                    </p>

                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      <span className="tag">Bills</span>
                      <span className="tag">Outages</span>
                      <span className="tag">Backup</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <div className="custom-card h-100">
                    <div className="icon-box-who">
                      <i className="bi bi-grid"></i>
                    </div>
                    <h5 className="fw-bold mb-1 rang-head mt-3">Businesses</h5>
                    <p className="text-muted small">
                      For SMEs and commercial operators that need to cut diesel
                      cost, improve reliability, and make better energy
                      investment decisions.
                    </p>

                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      <span className="tag">Diesel</span>
                      <span className="tag">Savings</span>
                      <span className="tag">Reliability</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <div className="custom-card h-100">
                    <div className="icon-box-who">
                      <i className="bi bi-clipboard-pulse"></i>
                    </div>
                    <h5 className="fw-bold mb-1 rang-head mt-3">
                      Critical facilities
                    </h5>
                    <p className="text-muted small">
                      For hotels, hospitals, offices, and facilities where power
                      interruptions are expensive and resilience matters.
                    </p>

                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      <span className="tag">Hotels</span>
                      <span className="tag">Continuity</span>
                      <span className="tag">Hospitals</span>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <div className="custom-card h-100">
                    <div className="icon-box-who">
                      <i className="bi bi-graph-up"></i>
                    </div>
                    <h5 className="fw-bold mb-1 rang-head mt-3">
                      Developers & advisors
                    </h5>
                    <p className="text-muted small">
                      For early-stage feasibility, energy strategy comparison,
                      and clearer technical-financial understanding before
                      deeper study.
                    </p>

                    <div className="d-flex flex-wrap gap-2 mt-auto">
                      <span className="tag">Feasibility</span>
                      <span className="tag">Strategy</span>
                      <span className="tag">Planning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-3">
          <div className="row g-4 align-items-start">
            <div className="dashboard-container">
              <h2 className="dashboard-title">What problem are you solving?</h2>
              <p className="dashboard-subtitle">
                What problem are you solving?
              </p>
            </div>

            <div className="container my-2">
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-4">
                  <div className="feature-card h-100">
                    <div className="feature-icon">
                      <i className="bi bi-graph-down"></i>
                    </div>

                    <h6 className="fw-semibold mt-3">Reduce diesel use</h6>

                    <p className="text-muted small mb-0">
                      Ideal for users with generator-heavy operations who want
                      to cut fuel cost while keeping power reliable.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <div className="feature-card h-100">
                    <div className="feature-icon">
                      <i className="bi bi-lightning-charge"></i>
                    </div>

                    <h6 className="fw-semibold mt-3">
                      Lower electricity bills
                    </h6>

                    <p className="text-muted small mb-0">
                      Useful for homes and businesses looking for a cleaner,
                      clearer way to understand savings potential.
                    </p>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <div className="feature-card h-100">
                    <div className="feature-icon">
                      <i className="bi bi-graph-up"></i>
                    </div>

                    <h6 className="fw-semibold mt-3">
                      Improve power reliability
                    </h6>

                    <p className="text-muted small mb-0">
                      For users dealing with outages, weak grid conditions, or
                      the need for backup and resilience planning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-fluid px-lg-4 py-3 mb-4">
          <div className="row g-4 align-items-start">
            <div className="dashboard-container">
              <h2 className="dashboard-title">
                Built for different energy setups
              </h2>
              <p className="dashboard-subtitle">
                Solarvy works with real-world energy setups, not just ideal
                solar conditions.
              </p>
            </div>

            <div className="container my-2">
              <div className="row  g-3">
                <div className="col-12 col-md-6">
                  <div className="p-4 shadow-sm rounded-4 ass-first mt-4">
                    <div>
                      <h5 className="fw-bold mb-2 rang-head">
                        Common starting points
                      </h5>
                      <small className="text-muted">
                        Whether you rely on the grid, a generator, or a mix,
                        Solarvy adapts to your starting point.
                      </small>
                    </div>
                    <div className="feature-list">
                      <div className="feature-item">
                        <span className="dot-blue"></span>
                        <span className="dots-texts">Grid only</span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-blue"></span>
                        <span className="dots-texts">Grid + generator</span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-blue"></span>
                        <span className="dots-texts">Solar + grid</span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-blue"></span>
                        <span className="dots-texts">Solar + battery</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-4 shadow-sm rounded-4 ass-first mt-4">
                    <div>
                      <h5 className="fw-bold mb-2 rang-head">
                        Hybrid-focused environments
                      </h5>
                      <small className="text-muted">
                        Ideal for places that depend on multiple power sources
                        and need both reliability and cost control.
                      </small>
                    </div>
                    <div className="feature-list-orange">
                      <div className="feature-item">
                        <span className="dot-orange"></span>
                        <span className="dots-texts">
                          Generator-dependent operations
                        </span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-orange"></span>
                        <span className="dots-texts">
                          Weak or unreliable grids
                        </span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-orange"></span>
                        <span className="dots-texts">
                          Facilities with critical loads
                        </span>
                      </div>

                      <div className="feature-item">
                        <span className="dot-orange"></span>
                        <span className="dots-texts">
                          Users comparing multiple energy strategies
                        </span>
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

export default WhoItsFor;
