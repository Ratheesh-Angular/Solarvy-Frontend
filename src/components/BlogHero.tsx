import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";

type BlogHeroProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function BlogHero({
  title,
  subtitle,
  children,
  className = "",
}: BlogHeroProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

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

  return (
    <section className={`hero d-flex align-items-center ass-bannr blog-hero ${className}`.trim()}>
      <div className="overlay"></div>

      <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
        <div className="row align-items-start text-divs gx-3 gx-lg-4">
          <div className="solar-top-navbar">
            <nav className={`navbar navbar-expand-lg  ${scrolled ? "scrolled" : ""}`}>
              <Link className="navbar-brand" to="/">
                <img src={logo} alt="SolarVy" className="solar-logo-img" />
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

              <div className={`collapse navbar-collapse ${open ? "show" : ""}`}>
                <ul className="navbar-nav ms-auto align-items-lg-center solar-nav-links">
                  <li className="nav-item">
                    <Link className="nav-link" to="/how-it-works" onClick={() => setOpen(false)}>
                      How It Works
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/sample-results" onClick={() => setOpen(false)}>
                      Sample Results
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/who-its-for" onClick={() => setOpen(false)}>
                      Who It's For
                    </Link>
                  </li>
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/blog" onClick={() => setOpen(false)}>
                      Blog
                    </NavLink>
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

          <div className="nav-bottom-section row align-items-center home-page">
            <div className="col-12 col-lg-10 text-white">
              <h1 className="bannr-text display-5 ass-page blog-hero-title">{title}</h1>
              {subtitle ? (
                <p className="bannr-text-s text-light mt-2 mb-5 ass-page-two blog-hero-subtitle">
                  {subtitle}
                </p>
              ) : null}
              {children}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
