import { Link } from "react-router-dom";
import BlogHero from "../components/BlogHero";
import Breadcrumbs from "../components/Breadcrumbs";
import PageSeo from "../components/PageSeo";
import "../css/blog.css";
import "../css/static-pages.css";

function About() {
  return (
    <div className="static-page blog-page">
      <PageSeo
        title="About Us | SolarVy"
        description="SolarVy is an independent energy intelligence platform helping homes and businesses make smarter energy decisions."
        path="/about"
      />
      <div className="full-body-color">
        <BlogHero
          title="About SolarVy"
          subtitle="Smarter energy decisions start with better information."
        />

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          <div className="static-content-body">
            <p>
              SolarVy is an independent energy intelligence platform helping
              homes and businesses understand their energy needs, evaluate their
              options and make more informed investment decisions.
            </p>
            <p>
              We bring together engineering insight, energy data and financial
              analysis to turn complex questions about power into clear,
              practical recommendations — from system sizing and estimated costs
              to savings, financing and trusted implementation options.
            </p>
            <p>
              Whether you are looking to reduce energy costs, improve reliability
              or invest in solar and battery storage, SolarVy helps you
              understand what you need, what it could cost, and the options
              available before you commit.
            </p>
            <p>
              Our goal is simple: to make energy decisions clearer, more
              transparent and easier to act on.
            </p>
            <Link className="static-about-cta" to="/how-it-works">
              Learn More About SolarVy →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
