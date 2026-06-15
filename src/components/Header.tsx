import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === "/";

  return (
    <>
      <div className="container position-relative z-1 menu-div">
        {isHome ? (
          // ✅ HOME HEADER
          <nav className="navbar navbar-expand-md position-absolute w-100 top-0">
            <div className="container-fluid">
              <Link className="navbar-brand text-white" to="/">
                <img src={logo} alt="logo" />
              </Link>

              {/* ✅ FIXED TOGGLER */}
              <button
                className="navbar-toggler"
                type="button"
                onClick={() => setOpen(!open)}
              >
                <span className="navbar-toggler-icon"></span>
              </button>

              {/* ✅ FIXED COLLAPSE */}
              <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
                <ul className="navbar-nav ms-auto gap-3">
                  <li>
                    <Link
                      className="text-white"
                      to="/how-it-works"
                      onClick={() => setOpen(false)}
                    >
                      How It Works
                    </Link>
                  </li>

                  <li>
                    <Link
                      className="text-white"
                      to="/sample-results"
                      onClick={() => setOpen(false)}
                    >
                      Sample Results
                    </Link>
                  </li>

                  <li>
                    <Link
                      className="text-white"
                      to="/who-its-for"
                      onClick={() => setOpen(false)}
                    >
                      Who It's For
                    </Link>
                  </li>

                  <li>
                    <button className="custom-btn">
                      Start Assessment
                      <img src={bttnarrow} alt="arrow" />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        ) : (
          // ✅ OTHER PAGES HEADER
          <nav className="navbar navbar-expand-md bg-white shadow">
            <div className="container-fluid">
              <Link className="navbar-brand" to="/">
                <img src={logo} alt="logo" />
              </Link>

              {/* ✅ FIXED TOGGLER */}
              <button
                className="navbar-toggler"
                type="button"
                onClick={() => setOpen(!open)}
              >
                ☰
              </button>

              {/* ✅ FIXED COLLAPSE */}
              <div
                className={`navbar-collapse ${open ? "d-block" : "d-none"} d-md-flex`}
              >
                <ul className="navbar-nav ms-auto gap-3">
                  <li>
                    <Link to="/how-it-works" onClick={() => setOpen(false)}>
                      How It Works
                    </Link>
                  </li>

                  <li>
                    <Link to="/sample-results" onClick={() => setOpen(false)}>
                      Sample Results
                    </Link>
                  </li>

                  <li>
                    <Link to="/who-its-for" onClick={() => setOpen(false)}>
                      Who It's For
                    </Link>
                  </li>

                  <li>
                    <button className="custom-btn">
                      Start Assessment
                      <img src={bttnarrow} alt="arrow" />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </nav>
        )}
      </div>
    </>
  );
}

export default Header;
