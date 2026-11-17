import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo.png";
import bttnarrow from "../assets/images/btton-arrow.png";
import ProfileMenu from "./ProfileMenu";
import { useAuth } from "../context/AuthContext";

type MarketingNavProps = {
  /** Bootstrap expand breakpoint. Home uses md; most pages use lg. */
  expand?: "md" | "lg";
  showBlog?: boolean;
  className?: string;
};

export default function MarketingNav({
  expand = "lg",
  showBlog = false,
  className = "",
}: MarketingNavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const breakpoint = expand === "md" ? 768 : 992;
    const handleResize = () => {
      if (window.innerWidth >= breakpoint) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [expand]);

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate("/");
  };

  const expandClass =
    expand === "md" ? "navbar-expand-md" : "navbar-expand-lg";
  const mobileOnlyClass = expand === "md" ? "d-md-none" : "d-lg-none";
  const desktopOnlyClass =
    expand === "md" ? "d-none d-md-flex" : "d-none d-lg-flex";

  return (
    <div className={`solar-top-navbar ${className}`.trim()}>
      <nav className={`navbar ${expandClass} ${scrolled ? "scrolled" : ""}`}>
        <Link className="navbar-brand" to="/" onClick={close}>
          <img src={logo} alt="SolarVy" className="solar-logo-img" />
        </Link>

        <button
          className={`navbar-toggler ${open ? "" : "collapsed"}`}
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
              <Link className="nav-link" to="/how-it-works" onClick={close}>
                How It Works
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/sample-results" onClick={close}>
                Sample Results
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/who-its-for" onClick={close}>
                Who It&apos;s For
              </Link>
            </li>
            {showBlog ? (
              <li className="nav-item">
                <NavLink className="nav-link" to="/blog" onClick={close}>
                  Blog
                </NavLink>
              </li>
            ) : null}
            {isAuthenticated ? null : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login" onClick={close}>
                    Log in
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/signup" onClick={close}>
                    Sign up
                  </Link>
                </li>
              </>
            )}
            {isAuthenticated ? (
              <>
                <li className={`nav-item ${mobileOnlyClass}`}>
                  <Link className="nav-link" to="/profile" onClick={close}>
                    Profile
                  </Link>
                </li>
                <li className={`nav-item ${mobileOnlyClass}`}>
                  <Link className="nav-link" to="/projects" onClick={close}>
                    Projects
                  </Link>
                </li>
                <li className={`nav-item ${mobileOnlyClass}`}>
                  <button
                    type="button"
                    className="nav-link"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : null}
            <li className="nav-item">
              <button
                type="button"
                className="solar-nav-btn"
                onClick={() => {
                  close();
                  navigate("/start-assessment");
                }}
              >
                Start Assessment
                <img src={bttnarrow} alt="" aria-hidden="true" />
              </button>
            </li>
            {isAuthenticated ? (
              <li
                className={`nav-item solar-profile-nav-item ${desktopOnlyClass}`}
              >
                <ProfileMenu
                  user={user}
                  onLogout={handleLogout}
                  onNavigate={close}
                />
              </li>
            ) : null}
          </ul>
        </div>
      </nav>
    </div>
  );
}
