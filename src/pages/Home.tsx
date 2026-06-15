import { useState } from "react";
import { Link } from "react-router-dom";
import "../assets/images/logo.png";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import bttnarrowhite from "../assets/images/btton-arrow-white.png";
import one from "../assets/images/1.png";
import two from "../assets/images/2.png";
import three from "../assets/images/3.png";
import onee from "../assets/images/11.png";
import twoo from "../assets/images/22.png";
import threee from "../assets/images/33.png";
import blur from "../assets/images/Overlay+Border+OverlayBlur.png";
import linkone from "../assets/images/Link2.png";
import linktwo from "../assets/images/Link3.png";
import link from "../assets/images/Link1.png";
import enery from "../assets/images/energy.png";
import quik from "../assets/images/quik.png";
import see from "../assets/images/see-bannar.png";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
function Home() {
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
    <div className="menu-div ">
      <section className="solar-hero-section">
        <div className="solar-hero-overlay"></div>

        <div className="container-fluid solar-hero-wrapper">
          <div className="solar-top-navbar">
            <nav
              className={`navbar navbar-expand-md  ${scrolled ? "scrolled" : ""}`}
            >
              <Link className="navbar-brand" to="/">
                <img src={logo} alt="logo" className="solar-logo-img" />
              </Link>

              <button
                className={`navbar-toggler ${open ? "" : "collapsed"}`}
                type="button"
                onClick={handleToggle}
                aria-expanded={open}
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              <div
                className={`collapse navbar-collapse ${open ? "show" : ""} ${window.innerWidth >= 768 ? "show" : ""}`}
              >
                <ul className="navbar-nav ms-auto align-items-lg-center solar-nav-links">
                  <li className="nav-item">
                    <Link
                      className="nav-link"
                      to="/how-it-works"
                      onClick={() => setOpen(false)}
                    >
                      {" "}
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

          <div className="row solar-main-row align-items-center">
            {/* LEFT SIDE */}
            <div className="col-12 col-lg-7">
              <div className="solar-left-area">
                {/* TITLE */}
                <h1 className="solar-main-title">
                  Find The Right Solar And
                  <br />
                  Backup Power System For Your Building
                </h1>

                {/* DESCRIPTION */}
                <p className="solar-main-desc">
                  Solarvy helps homes and businesses estimate solar size,
                  battery storage, diesel reduction, savings, and payback before
                  speaking to installers or committing money.
                </p>

                {/* BUTTONS */}
                <div className="solar-action-group">
                  <button
                    className="solar-primary-btn"
                    onClick={() => navigate("/start-assesement")}
                  >
                    <span>Start Free Assessment</span>

                    <img src={bttnarrow} alt="arrow" />
                  </button>

                  <a
                    href="#"
                    className="solar-sample-link"
                    onClick={() => navigate("/sample-results")}
                  >
                    See Sample Result
                  </a>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5 mt-4 mt-lg-0">
              <div className="solar-form-column">
                <div className="solar-preview-card">
                  <h2 className="solar-preview-title">
                    Quick Assessment Preview
                  </h2>

                  <div className="row g-2 mb-3">
                    <div className="col">
                      <label className="quick-lable">Property Type</label>
                      <select
                        className="form-select select-text"
                        defaultValue=""
                        onChange={(e) => {
                          e.target.style.color = "#000";
                        }}
                      >
                        <option value="" disabled hidden>
                          Select
                        </option>
                        <option value="home">Home</option>
                        <option value="hotel">Hotel</option>
                        <option value="factory">Factory</option>
                        <option value="commercial building">
                          Commercial Building
                        </option>
                        <option value="hospital clinic">Hospital/Clinic</option>
                        <option value="school education">
                          School/Education
                        </option>
                      </select>
                    </div>
                    <div className="col">
                      <label className="quick-lable">Location</label>
                      <select
                        className="form-select select-text"
                        defaultValue=""
                        onChange={(e) => {
                          e.target.style.color = "#000";
                        }}
                      >
                        <option value="" disabled hidden>
                          Select
                        </option>
                        <option>Nigeria</option>
                      </select>
                    </div>
                  </div>

                  <label className="quick-lable">
                    Monthly Electricity Bill
                  </label>
                  <input
                    type="text"
                    className="form-control select-text mb-2"
                    placeholder=""
                  />

                  <div className="row g-2 mb-3">
                    <div className="col">
                      <label className="quick-lable">Power Setup</label>
                      <select
                        className="form-select select-text"
                        defaultValue=""
                        onChange={(e) => {
                          e.target.style.color = "#000";
                        }}
                      >
                        <option value="" disabled hidden>
                          Select
                        </option>
                        <option value="Grid Generator">Grid + Generator</option>
                        <option value="Grid Only">Grid Only</option>
                        <option value="Solar grid">Solar grid</option>
                      </select>
                    </div>
                    <div className="col">
                      <label className="quick-lable">Main Objective</label>
                      <select
                        className="form-select select-text"
                        defaultValue=""
                        onChange={(e) => {
                          e.target.style.color = "#000";
                        }}
                      >
                        <option value="" disabled hidden>
                          Select
                        </option>
                        <option value="1">Reduce Diesel Use</option>
                        <option value="2">Reduce Electricity Bills</option>
                        <option value="3">Backup During Outages</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="custom-btn other-section d-flex align-items-center justify-content-between w-100"
                    onClick={() => navigate("/start-assesement")}
                  >
                    {" "}
                    Start Assessment
                    <img src={bttnarrowhite} alt="arrow" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works py-4">
        <div className="text-center">
          <h2 className="head-nor" style={{ fontSize: "25px !important" }}>
            How Solarvy Works
          </h2>
          <p className="subtitle ">
            A simple energy decision workflow built around problem-solving, not
            just calculations.
          </p>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="step text-center">
                <div className="icon-stack">
                  <img src={one} alt="step 1" className="badge-img" />
                  <img src={blur} alt="bg" className="blur-img" />
                  <img src={onee} alt="icon" className="main-icon" />
                </div>

                <h4 className="head-blue mt-3">Enter your energy data</h4>

                <p>
                  Use your electricity bill, standard appliances, or custom
                  equipment to estimate demand.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step text-center">
                <div className="icon-stack">
                  <img src={two} alt="step 1" className="badge-img" />
                  <img src={blur} alt="bg" className="blur-img" />
                  <img src={twoo} alt="icon" className="main-icon" />
                </div>

                <h4 className="head-blue mt-3">
                  Solarvy analyses your energy profile
                </h4>

                <p>
                  Estimate solar size, battery storage, hybrid setup, and likely
                  value drivers.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step text-center">
                <div className="icon-stack">
                  <img src={three} alt="step 1" className="badge-img" />
                  <img src={blur} alt="bg" className="blur-img" />
                  <img src={threee} alt="icon" className="main-icon" />
                </div>

                <h4 className="head-blue mt-3">Get your recommendation</h4>

                <p>
                  View system sizing, savings, payback, downloadable report, and
                  next-step options.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="d-flex align-items-center bannar-see py-4">
        <div className="container px-lg-5 px-3 text-center mb-3">
          <h2 className="head-nor">See A Sample Energy Assessment</h2>

          <p className="subtitle mb-4">
            A simple energy decision workflow built around
            <br />
            problem-solving, not just calculations.
          </p>

          <div className="row g-4">
            <div className="col-md-6 d-flex">
              <div className="left-wrapper w-100">
                <div className="card-box d-flex justify-content-between align-items-center">
                  <span>Location</span>
                  <span className="text-muted text-color">Lagos, Nigeria</span>
                </div>

                <div className="card-box d-flex justify-content-between align-items-center">
                  <span>Property type</span>
                  <span className="text-muted text-color">Hotel</span>
                </div>

                <div className="card-box d-flex justify-content-between align-items-center">
                  <span>Objective</span>
                  <span className="text-muted text-color">
                    Reduce diesel use
                  </span>
                </div>

                <div className="card-box d-flex justify-content-between align-items-center">
                  <span>System type</span>
                  <span className="text-muted text-color">
                    Hybrid solar + battery
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-6 ">
              <div className="row g-4 w-100 h-100">
                <div className="col-6 d-flex">
                  <div className="card-boxs text-center w-100">
                    <small>
                      <img src={enery} alt="icon" className="graph-image" />
                      Solar PV
                    </small>
                    <h3>28 kWp</h3>
                    <p>Indicative size</p>
                  </div>
                </div>

                <div className="col-6 d-flex">
                  <div className="card-boxs text-center w-100">
                    <small>
                      <img src={enery} alt="icon" className="graph-image" />
                      Battery
                    </small>
                    <h3>40 kWh</h3>
                    <p>Backup storage</p>
                  </div>
                </div>

                <div className="col-6 d-flex">
                  <div className="card-boxs text-center w-100">
                    <small>
                      <img src={enery} alt="icon" className="graph-image" />
                      Annual savings
                    </small>
                    <h3>NGN 7.8m</h3>
                    <p>Indicative</p>
                  </div>
                </div>

                <div className="col-6 d-flex">
                  <div className="card-boxs text-center w-100">
                    <small>
                      <img src={enery} alt="icon" className="graph-image" />
                      Payback
                    </small>
                    <h3>4.2 yrs</h3>
                    <p>Simple payback</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="usecase-section py-1 mt-4 mb-4">
        <div className="container-fluid px-lg-5 px-3">
          <h2 className="head-nor">Built for real use cases</h2>

          <div className="row g-4">
            <div className="col-lg-4 col-md-6">
              <div className="usecase-card">
                <img src={link} alt="" className="boxs-img" />

                <div className="p-4">
                  <h4 className="head-blue-left">Homes</h4>
                  <p className="sub-left">
                    Backup planning, appliance-based load estimation, and
                    residential system sizing.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="usecase-card">
                <img src={linkone} alt="" className="boxs-img" />

                <div className="p-4">
                  <h4 className="head-blue-left">Hospitals</h4>
                  <p className="sub-left">
                    Critical load planning, resilience, and structured backup
                    recommendations.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-4 col-md-6">
              <div className="usecase-card">
                <img src={linktwo} alt="" className="boxs-img" />

                <div className="p-4">
                  <h4 className="head-blue-left">Factories</h4>
                  <p className="sub-left">
                    Commercial and industrial energy sizing for larger, more
                    valuable projects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="hero-section">
          <div className="overlay-wrapper">
            <div className="overlay-card">
              <div>
                <h1>Start With A Simple Assessment</h1>

                <p>
                  Estimate the solar, battery, and hybrid system suited to your
                  building, then download a structured report or request
                  installer quotes.
                </p>

                <div className="d-flex justify-content-center align-items-center gap-3 mt-4 flex-wrap text-center">
                  <button
                    type="button"
                    className="custom-btn other-section strst"
                    onClick={() => navigate("/start-assesement")}
                  >
                    {" "}
                    Start Assessment
                    <img src={bttnarrowhite} alt="arrow" />
                  </button>

                  <a
                    href="#"
                    className="see-link"
                    onClick={() => navigate("/sample-results")}
                  >
                    See Sample Result
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
