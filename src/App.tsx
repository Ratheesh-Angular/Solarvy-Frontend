import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import "./css/ass.css";
import "./css/ass-result.css";
import "./css/howitwork.css";
import "./css/sample.css";
import "./css/WhoItsFor.css";
import "./css/MatchedInstallers.css";

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

function App() {
  //testgit 08.04.2026
  return (
    <Router>
      <ScrollToTop />
      {/* MIDDLE CONTENT */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/start-assesement" element={<Assesement />} />
        <Route path="/assesement-result" element={<AssesementResult />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/sample-results" element={<SampleResults />} />
        <Route path="/who-its-for" element={<WhoItsFor />} />
        <Route path="/matched-installers" element={<MatchedInstallers />} />
        <Route path="/expert-review" element={<ExpertReview />} />
        <Route path="/request-intro" element={<RequestIntro />} />
      </Routes>

      {/* FOOTER */}
      <Footer />
    </Router>
  );
}

export default App;
