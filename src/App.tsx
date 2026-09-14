import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
  useParams,
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
import AdminUsers from "./pages/AdminUsers.tsx";
import AdminUserDetail from "./pages/AdminUserDetail.tsx";
import AdminAssessmentDetail from "./pages/AdminAssessmentDetail.tsx";
import AdminAssessmentResults from "./pages/AdminAssessmentResults.tsx";
import AdminAssessments from "./pages/AdminAssessments.tsx";
import AdminLeads from "./pages/AdminLeads.tsx";
import AdminExcelTemplate from "./pages/AdminExcelTemplate.tsx";
import AdminBillInput from "./pages/AdminBillInput.tsx";
import AdminRecommendations from "./pages/AdminRecommendations.tsx";
import AdminChatbotPrompt from "./pages/AdminChatbotPrompt.tsx";
import AdminFaqs from "./pages/AdminFaqs.tsx";
import AdminRoute from "./components/AdminRoute.tsx";
import AdminLayout from "./components/AdminLayout.tsx";
import VisitorTracker from "./components/VisitorTracker.tsx";
import ChatbotWidget from "./components/ChatbotWidget.tsx";
import "./css/admin/index.css";

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

function RedirectVisitorToUser() {
  const { id } = useParams();
  return <Navigate to={`/admin/users/${id ?? ""}`} replace />;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <VisitorTracker />
      <ChatbotWidget />
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route
              path="users/:id/assessments/:assessmentId"
              element={<AdminAssessmentDetail />}
            />
            <Route
              path="users/:id/assessments/:assessmentId/results"
              element={<AdminAssessmentResults />}
            />
            <Route
              path="visitors"
              element={<Navigate to="/admin/users" replace />}
            />
            <Route path="visitors/:id" element={<RedirectVisitorToUser />} />
            <Route path="assessments" element={<AdminAssessments />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="excel-template" element={<AdminExcelTemplate />} />
            <Route path="bill-input" element={<AdminBillInput />} />
            <Route path="recommendations" element={<AdminRecommendations />} />
            <Route path="chatbot-prompt" element={<AdminChatbotPrompt />} />
            <Route path="faqs" element={<AdminFaqs />} />
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
