import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import BlogHero from "../components/BlogHero";
import Breadcrumbs from "../components/Breadcrumbs";
import PageSeo from "../components/PageSeo";
import "../css/static-pages.css";

type UpcomingPageProps = {
  title: string;
  description: string;
  path: string;
};

export default function UpcomingPage({
  title,
  description,
  path,
}: UpcomingPageProps) {
  const pageTitle = `${title} | Coming Soon | SolarVy`;

  return (
    <div className="static-page blog-page">
      <PageSeo title={pageTitle} description={description} path={path} />
      <div className="full-body-color">
        <BlogHero
          title={title}
          subtitle="This part of SolarVy is coming soon."
        />

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          <div className="static-content-body upcoming-page-body">
            <p className="upcoming-page-badge" aria-label="Coming soon">
              <Clock size={18} strokeWidth={2} aria-hidden="true" />
              Coming soon
            </p>
            <p>{description}</p>
            <p>
              You can still run a free energy assessment, explore financing, and
              connect with installers through the rest of the platform.
            </p>
            <div className="upcoming-page-actions">
              <Link className="static-about-cta" to="/start-assessment">
                Start assessment →
              </Link>
              <Link className="static-about-cta upcoming-page-cta-secondary" to="/">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}