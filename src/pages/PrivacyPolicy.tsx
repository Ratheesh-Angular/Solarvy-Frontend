import BlogHero from "../components/BlogHero";
import Breadcrumbs from "../components/Breadcrumbs";
import PageSeo from "../components/PageSeo";
import "../css/blog.css";
import "../css/static-pages.css";

function PrivacyPolicy() {
  return (
    <div className="static-page blog-page">
      <PageSeo
        title="Privacy Policy | SolarVy"
        description="How SolarVy collects, uses, stores, shares and protects personal information."
        path="/privacy-policy"
      />
      <div className="full-body-color">
        <BlogHero
          title="Privacy Policy"
          subtitle="SolarVy respects your privacy and is committed to protecting your personal information."
        />

        <section className="container-fluid px-lg-4 py-4">
          <Breadcrumbs />
          <p className="static-legal-updated">
            Last updated: 29 September 2026
          </p>
          <div className="static-legal-content">
              <p>
                This Privacy Policy explains how SolarVy collects, uses, stores,
                shares and protects personal information when you use our
                website, energy assessment tools, reports, project services,
                installer introductions, Expert Review, financing-related
                services and other SolarVy services.
              </p>

              <h2>1. Who We Are</h2>
              <p>
                SolarVy is an energy intelligence platform helping individuals
                and businesses understand their energy needs, evaluate potential
                solutions and make more informed energy decisions.
              </p>
              <p>
                For the purposes of applicable data-protection law, the relevant
                SolarVy legal entity will act as the data controller where it
                determines how and why your personal information is processed.
              </p>
              <p>
                Legal entity: Solarvy Limited
                <br />
                Email:{" "}
                <a href="mailto:info@solarvy.ng">info@solarvy.ng</a>
              </p>

              <h2>2. Information We Collect</h2>
              <p>Depending on how you use SolarVy, we may collect:</p>

              <h3>Contact information</h3>
              <p>
                Your name, email address, telephone number and other contact
                details.
              </p>

              <h3>Account information</h3>
              <p>
                Login details, account preferences and information associated
                with your SolarVy account.
              </p>

              <h3>Property and energy information</h3>
              <p>
                Property type, location, electricity usage, electricity
                expenditure, generator usage, fuel expenditure, operating hours,
                appliances or equipment, energy requirements and other
                information submitted during an assessment.
              </p>

              <h3>Project information</h3>
              <p>
                Your SolarVy assessments, recommendations, reports, installer
                requests, quotations, Expert Reviews, financing enquiries and
                project status.
              </p>

              <h3>Commercial information</h3>
              <p>
                For business customers, we may collect company name, facility
                type, business contact details and information relating to your
                organisation’s energy requirements.
              </p>

              <h3>Financing information</h3>
              <p>
                Where you choose to explore financing, we may collect information
                necessary to assess or facilitate your enquiry.
              </p>
              <p>
                Where additional financial, identity or other information is
                required by a financing provider, you should be clearly informed
                what is being collected, why it is required and who will receive
                it.
              </p>

              <h3>Communications</h3>
              <p>
                Messages, enquiries, feedback and other communications you send
                to SolarVy.
              </p>

              <h3>Technical and usage information</h3>
              <p>
                We may collect information such as IP address, browser type,
                device information, pages visited, interactions with SolarVy and
                similar technical information.
              </p>

              <h3>Payment information</h3>
              <p>
                Where you purchase a SolarVy service, payment information may be
                processed by our payment service providers. SolarVy should only
                retain payment information that is necessary for legitimate
                business, accounting and compliance purposes.
              </p>

              <h2>3. How We Use Your Information</h2>
              <p>We may use personal information to:</p>
              <ul>
                <li>provide and operate SolarVy;</li>
                <li>generate energy assessments and recommendations;</li>
                <li>create and manage your project;</li>
                <li>prepare reports and energy analysis;</li>
                <li>provide customer support;</li>
                <li>facilitate installer introductions;</li>
                <li>provide Expert Review services;</li>
                <li>facilitate financing enquiries you request;</li>
                <li>communicate about your assessment or project;</li>
                <li>process payments;</li>
                <li>
                  improve SolarVy’s models, services and user experience;
                </li>
                <li>detect misuse, fraud or security threats;</li>
                <li>
                  maintain appropriate business and regulatory records;
                </li>
                <li>comply with legal obligations; and</li>
                <li>send marketing communications where permitted.</li>
              </ul>
              <p>
                We should not use personal information for purposes incompatible
                with those communicated to you without an appropriate legal
                basis.
              </p>

              <h2>4. Automated Analysis and Recommendations</h2>
              <p>
                SolarVy uses information provided by users together with energy
                data, engineering assumptions and analytical models to generate
                assessments, estimates and recommendations.
              </p>
              <p>
                Some outputs may therefore be generated or supported by automated
                processing.
              </p>
              <p>
                Where applicable, SolarVy will provide appropriate information
                about such processing and respect rights available under
                applicable data-protection law.
              </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
