import { useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import "../App.css";

function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  return (
    <footer className="footer-section">
      <div className="container">
        <div className="row justify-content-between">
          {/* LEFT SIDE */}
          <div className="col-md-7 mb-4">
            <a
              className="navbar-brand footer-logoss text-white fw-bold mb-4"
              href="#"
            >
              <img src={logo} alt="logo" />
            </a>

            <p className="footer-text mt-4">
              Solarvy helps homes and businesses estimate energy demand,
              recommended system size, savings, and payback before they commit
              to equipment or installation.
            </p>
          </div>

          {/* RIGHT SIDE */}
          <div className="col-md-5 text-md-end">
            <div className="row justify-content-md-end">
              <div className="col-6 col-md-4 mb-3">
                <ul className="footer-links">
                  <h6 className="newsletter-title mb-4">Main Page</h6>
                  <li>
                    <button
                      type="button"
                      className="footer-link-nav"
                      onClick={() => navigate("/how-it-works")}
                    >
                      How It Works
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="footer-link-nav"
                      onClick={() => navigate("/sample-results")}
                    >
                      Sample Results
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="footer-link-nav"
                      onClick={() => navigate("/who-its-for")}
                    >
                      Who It’s For
                    </button>
                  </li>
                </ul>
              </div>

              <div className="col-6 col-md-4 mb-3">
                <ul className="footer-links">
                  <h6 className="newsletter-title mb-4">Company</h6>
                  <li>About Us</li>
                  <li>Contact Us</li>
                  <li>Terms Of Use</li>
                  <li>Privacy Policy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="newsletter-section">
        <div className="newsletter-overlay">
          <div className="container">
            <div className="row align-items-center">
              {/* LEFT SIDE */}
              <div className="col-md-6">
                <h6 className="newsletter-title">Newsletter</h6>

                <div className="input-box mt-3">
                  <input
                    type="email"
                    className="footer-newsletter-input"
                    placeholder="Enter your email..."
                    autoComplete="email"
                  />
                  <button>↗</button>
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="col-md-6 text-md-end mt-4 mt-md-0">
                <p className="email-label">Email Us</p>
                <h6 className="email-text">support@solarvy.ng</h6>
              </div>
            </div>

            <hr className="divider mt-4" />
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-center px-3">
        <p className="mb-0 text-center footer-copyright">
          © {currentYear} SolarVy, Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
