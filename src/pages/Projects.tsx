import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MarketingNav from "../components/MarketingNav";
import PageSeo from "../components/PageSeo";
import { useAuth } from "../context/AuthContext";
import "../css/auth-pages.css";

function Projects() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="account-stub-page">
      <PageSeo
        title="Projects | SolarVy"
        description="View your SolarVy projects."
        path="/projects"
      />
      <div className="account-stub-nav">
        <MarketingNav />
      </div>
      <main className="account-stub-main">
        <div className="account-stub-card">
          <h1 className="account-stub-title">Projects</h1>
          <p className="account-stub-copy">
            Your projects will appear here soon. Check back shortly.
          </p>
        </div>
      </main>
    </div>
  );
}

export default Projects;