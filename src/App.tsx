import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./App.css";
import "./css/ass.css";
import "./css/ass-result.css";
import "./css/howitwork.css";
import "./css/sample.css";
import "./css/WhoItsFor.css";
import "./css/MatchedInstallers.css";
import "./css/solarvy-feedback.css";

import Footer from "./components/Footer.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import Home from "./pages/Home.tsx";
import Assesement from "./pages/Assesement.tsx";
import AssesementResult from "./pages/AssessmentResult.tsx";
import HowItWorks from "./pages/HowItWorks.tsx";
import SampleResults from "./pages/SampleResults.tsx";
import WhoItsFor from "./pages/WhoItsFor.tsx";
import MatchedInstallers from "./pages/MatchedInstallers.tsx";
import ExpertReview from "./pages/ExpertReview.tsx";
import RequestIntro from "./pages/RequestIntro.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminBillInput from "./pages/AdminBillInput.tsx";
import AdminRecommendations from "./pages/AdminRecommendations.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import AdminLayout from "./components/AdminLayout.tsx";
import "./css/admin.css";

function MainLayout() {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
}

/** Preserve query string when redirecting misspelled assessment URLs. */
function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bill-input" element={<AdminBillInput />} />
            <Route path="recommendations" element={<AdminRecommendations />} />
          </Route>
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/start-assessment" element={<Assesement />} />
          <Route path="/assessment-result" element={<AssesementResult />} />
          <Route
            path="/start-assesement"
            element={<RedirectWithSearch to="/start-assessment" />}
          />
          <Route
            path="/assesement-result"
            element={<RedirectWithSearch to="/assessment-result" />}
          />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/sample-results" element={<SampleResults />} />
          <Route path="/who-its-for" element={<WhoItsFor />} />
          <Route path="/matched-installers" element={<MatchedInstallers />} />
          <Route path="/expert-review" element={<ExpertReview />} />
          <Route path="/request-intro" element={<RequestIntro />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
