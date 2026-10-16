import { Link } from "react-router-dom";
import BlogHero from "../components/BlogHero";
import Breadcrumbs from "../components/Breadcrumbs";
import PageSeo from "../components/PageSeo";
import "../css/blog.css";
import "../css/static-pages.css";

function TermsOfUse() {
  return (
    <div className="static-page blog-page">
      <PageSeo
        title="Terms of Use | SolarVy"
        description="Terms of Use governing access to and use of the SolarVy website, energy assessment tools, and related services."
        path="/terms-of-use"
      />
      <div className="full-body-color">
        <BlogHero
          title="Terms of Use"
          subtitle="Please read these terms carefully before using SolarVy."
        />

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          <p className="static-legal-updated">
            Last updated: 29 September 2026
          </p>
          <div className="static-legal-content">
              <p>
                Welcome to SolarVy. These Terms of Use govern your access to and
                use of the SolarVy website, energy assessment tools, reports,
                recommendations, project features and related services.
              </p>
              <p>
                By accessing or using SolarVy, you agree to these Terms. If you
                do not agree, please do not use the platform.
              </p>

              <h2>1. About SolarVy</h2>
              <p>
                SolarVy is an energy intelligence platform designed to help
                individuals and businesses understand their energy needs,
                evaluate potential energy solutions and make more informed
                decisions.
              </p>
              <p>
                SolarVy may provide energy assessments, indicative system
                recommendations, estimated costs and savings, downloadable
                reports, installer introductions, Expert Review services,
                financing-related information and other project-support
                services.
              </p>

              <h2>2. Energy Assessments and Recommendations</h2>
              <p>
                SolarVy recommendations are generated using information provided
                by users together with engineering assumptions, energy data,
                equipment assumptions and analytical models.
              </p>
              <p>
                Unless expressly stated otherwise, assessment results are
                indicative planning estimates and not final engineering designs.
              </p>
              <p>
                Actual energy requirements, equipment specifications, system
                performance, installation costs and savings may differ because of
                site conditions, energy-use patterns, equipment selection,
                tariffs, fuel prices, weather, installation design and other
                factors.
              </p>
              <p>
                A site survey and detailed engineering assessment may therefore
                be required before equipment is purchased or installed.
              </p>

              <h2>3. Information You Provide</h2>
              <p>
                You are responsible for providing information that is reasonably
                accurate and complete.
              </p>
              <p>
                SolarVy recommendations may be affected by inaccurate or
                incomplete information, including electricity expenditure,
                generator usage, property information, operating hours, equipment
                loads and other assessment inputs.
              </p>

              <h2>4. Estimated Costs, Savings and Payback</h2>
              <p>
                Any project costs, electricity savings, fuel savings, payback
                periods, financial returns or similar figures displayed by
                SolarVy are estimates based on the information and assumptions
                available at the time of assessment.
              </p>
              <p>
                They are not guarantees of future costs, savings or financial
                performance.
              </p>
              <p>Actual results may vary.</p>

              <h2>5. Installers and Other Service Providers</h2>
              <p>
                SolarVy may introduce users to independent installers,
                contractors, suppliers or other service providers.
              </p>
              <p>
                Unless expressly stated otherwise, these providers operate
                independently from SolarVy.
              </p>
              <p>
                Users should review quotations, specifications, warranties,
                contractual terms and other relevant information before
                appointing a provider.
              </p>
              <p>
                Where SolarVy receives a referral, introduction, transaction or
                other commercial fee from a provider, appropriate disclosures
                should be made where required.
              </p>

              <h2>6. Expert Review</h2>
              <p>
                Where an Expert Review is purchased, SolarVy will review the
                information and documentation submitted within the defined scope
                of that service.
              </p>
              <p>
                An Expert Review does not replace any statutory approval,
                physical inspection, detailed engineering design, professional
                certification or other specialist service unless this is
                expressly included in the agreed scope.
              </p>
              <p>
                The specific scope, deliverables, fees and turnaround time should
                be disclosed before purchase.
              </p>

              <h2>7. Financing</h2>
              <p>
                SolarVy may provide information about financing options or
                introduce users to third-party financing providers.
              </p>
              <p>
                Unless expressly identified otherwise, SolarVy is not the lender
                and does not make the lending decision.
              </p>
              <p>
                Financing eligibility, interest rates, fees, repayment terms,
                approval and disbursement are determined by the relevant
                financing provider and are subject to that provider’s terms and
                applicable law.
              </p>

              <h2>8. Payments and Refunds</h2>
              <p>
                Where SolarVy charges for a service, the applicable price and
                material terms will be disclosed before payment.
              </p>
              <p>
                Any applicable cancellation or refund conditions should also be
                presented before purchase.
              </p>

              <h2>9. Projects</h2>
              <p>
                SolarVy may allow users to create or maintain project records
                containing assessments, recommendations, installer interactions,
                Expert Reviews, financing enquiries and other project
                information.
              </p>
              <p>
                Project status information is provided to help users organise and
                follow their energy journey and does not itself guarantee that an
                installer, financier or other third party will complete a
                particular action.
              </p>

              <h2>10. Intellectual Property</h2>
              <p>
                The SolarVy name, branding, website design, software, assessment
                methodology, reports, databases, analytical models and other
                proprietary platform materials are owned by or licensed to
                SolarVy, except where otherwise stated.
              </p>
              <p>
                Users may use reports generated for them for their own personal
                or business decision-making purposes.
              </p>
              <p>
                Users may not reproduce, reverse engineer, commercially exploit
                or systematically extract SolarVy’s proprietary platform,
                methodology or content except with permission or as otherwise
                permitted by law.
              </p>

              <h2>11. Acceptable Use</h2>
              <p>
                Users must not misuse SolarVy, attempt unauthorised access,
                interfere with platform operation, submit deliberately false or
                fraudulent information, scrape or systematically extract platform
                data, impersonate another person, or use the platform for
                unlawful purposes.
              </p>

              <h2>12. Privacy and Personal Data</h2>
              <p>
                SolarVy processes personal information in accordance with its{" "}
                <Link to="/privacy-policy">Privacy Policy</Link> and applicable
                data-protection requirements.
              </p>
              <p>
                Users should review the Privacy Policy to understand what
                information SolarVy collects, why it is collected, how it may be
                shared and the rights available to them.
              </p>

              <h2>13. Availability and Changes</h2>
              <p>
                SolarVy may update, improve, modify or discontinue features of
                the platform from time to time.
              </p>
              <p>
                We aim to provide a reliable service but cannot guarantee that
                the platform will always operate without interruption or error.
              </p>

              <h2>14. Responsibility and Liability</h2>
              <p>
                SolarVy will exercise reasonable care in providing its services.
              </p>
              <p>
                However, estimates and recommendations depend on user-provided
                information, underlying assumptions and circumstances that may
                change.
              </p>
              <p>
                Nothing in these Terms excludes or limits any responsibility or
                liability that cannot lawfully be excluded or limited.
              </p>

              <h2>15. Complaints and Dispute Resolution</h2>
              <p>
                If you are dissatisfied with a SolarVy service, please contact us
                first so that we can investigate and attempt to resolve the
                matter.
              </p>
              <p>
                Email:{" "}
                <a href="mailto:info@solarvy.ng">info@solarvy.ng</a>
              </p>
              <p>
                Contact page: <Link to="/contact">Contact Us</Link>
              </p>

              <h2>16. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Federal Republic of
                Nigeria.
              </p>
              <p>
                Any dispute will be handled in accordance with applicable
                Nigerian law and any agreed dispute-resolution procedure,
                without restricting any mandatory rights available to consumers.
              </p>

              <h2>17. Changes to These Terms</h2>
              <p>We may update these Terms from time to time.</p>
              <p>
                When material changes are made, the updated version and effective
                date will be published on SolarVy.
              </p>

              <h2>18. Contact Us</h2>
              <p>
                Questions about these Terms can be submitted through the{" "}
                <Link to="/contact">Contact Us</Link> page or sent to:
              </p>
              <p>
                Solarvy Limited
                <br />
                <a href="mailto:info@solarvy.ng">info@solarvy.ng</a>
              </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TermsOfUse;
