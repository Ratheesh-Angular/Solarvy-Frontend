SolarVy AI Energy Assistant
Detailed Product Requirements & Technical Specification | Version 1.0 | 12 November 2026
CONFIDENTIAL — Internal product and development planning. Draft specification; architecture and
integrations must be confirmed against the live SolarVy codebase.
1. Executive summary
Build a hybrid guided and conversational AI assistant embedded in SolarVy.ng. It helps visitors
understand solar energy, finish the assessment, interpret authenticated assessment results, explore
verified installer and financing options, track enquiries and reach human support. The existing
SolarVy engineering engine—not the language model—is authoritative for sizing, costs and savings.
2. Objectives and non-goals
 Reduce assessment abandonment and customer confusion, particularly on mobile.
 Explain technical outputs in plain language with source, assumptions and estimate labels.
 Increase qualified, consent-based installer and finance enquiries.
 Offer accurate, authenticated project updates and human escalation.
 Non-goal: autonomous engineering certification, credit approval, final installation quotations or
unrestricted AI access to customer records.
3. Personas and journeys
Persona Primary journey Success outcome
First-time homeowner FAQ guided assessment → Completed assessment
Business owner Special equipment guidance →
results
Understood energy
requirements
Assessment customer Authenticate explain report → Clear explanation tied to
actual values
Finance seeker Explore matches consented →
enquiry
Qualified preliminary
introduction
Installer seeker Compare verified matches →
consented enquiry
Appropriate installer contact
Returning customer Authenticate project status → Accurate status and next step
4. User experience requirements
 Floating chat launcher on mobile and desktop, keyboard accessible, non-obstructive and easy to
dismiss.
 Opening text: “Hello! I’m SolarVy’s AI Energy Assistant. I can help with your assessment, solar
results, financing and installers. What would you like help with?”
 Suggested actions: Help with my assessment; Explain my solar results; Explore financing; Find
an installer; Track my enquiry; Talk to support.
 Support free-text questions and guided selections in the same conversation.
 Show clear AI identification, privacy link, loading state, retry, feedback and human-support
option.
 Do not promise “5 minutes” unless measured; assessment guidance should be contextual to the
current step.
 No personal results displayed until authenticated and authorised. Avoid revealing private
information in notifications or previews.
5. Functional requirements and acceptance criteria
ID Requirement Acceptance test
FR-01 Answer general solar FAQs
from approved knowledge
base
Grounded answer; uncertainty
expressed where content
absent
FR-02 Explain assessment fields and
appliances
Plain-language help; no
unsupported wattage defaults
FR-03 Explain actual customer
results
Every numerical value equals
authorised engine output
FR-04 Explain financing stages and
products
No invented rates, repayments
or approval
FR-05 Explain verified installer
matches
No unverified badges, ranks or
availability
FR-06 Track authorised
enquiry/project
Cross-account access blocked
FR-07 Escalate to support Ticket ID returned only after
successful creation
FR-08 Obtain consent before
referrals
No partner handoff without
valid recorded authorisation
FR-09 Handle missing/failed
integrations
Honest fallback, retry or
human escalation
FR-10 Capture analytics Funnel and quality metrics
recorded with privacy controls
6. Architecture and trust boundaries
Website widget SolarVy authenticated chat backend AI orchestration layer allowlisted, → → →
permission-checked tools. Trusted sources: approved knowledge base, engineering engine, customer
assessment service, verified installer registry, verified financing registry, project/case service and
support ticket service. The model receives only scoped, minimum-necessary results. The server—not
the model—enforces identity, access rights, consent and transaction permissions.
 Use a server-side model integration; never expose API credentials to the browser.
 Separate retrieval of public FAQs from retrieval of private assessment and project records.
 Treat user text, uploads, partner descriptions and retrieved content as untrusted; defend against
prompt injection.
 Use deterministic validation of tool parameters, typed schemas, timeouts, rate limits and retries.
 No direct database query tool or unrestricted browsing/action capability for the model.
 Maintain a versioned knowledge base, prompts, tools and engineering calculation versions.
7. Proposed API contracts (adapt to existing stack)
Endpoint Method Access Purpose
/api/assistant/chat POST Public/session Send message, receive
reply and tool
provenance
/api/assistant/
assessments/{id}
GET Authenticated owner Read authorised
assessment summary
/api/assistant/
projects/{id}
GET Authenticated owner Read case status
/api/assistant/
installers
GET Public/filtered List approved installer
facts
/api/assistant/
financing
GET Public/filtered List verified product
criteria
/api/assistant/
support
POST Rate-limited /
authorised
Create support ticket
/api/assistant/
consents
POST Authenticated Record explicit
partner-sharing
consent
8. Example payloads
Chat request: {"session_id":"example-session","message":"Why is my battery 10
kWh?","assessment_id":"SV-ASSESS-001"}
Engineering response: {"assessment_id":"SVASSESS-001","battery_capacity_kwh":10,"usable_capacity_kwh":8,"daily_usage_kwh":12,"assumptions
":{"usable_fraction":0.8},"source":"solarvy_assessment_engine","calculation_version":"example"}
All identifiers and numbers above are illustrative. A response should include source metadata,
retrieval timestamp where relevant, units and an estimate/finality flag.
9. Engineering integrity
 The assistant must never compute or overwrite a personalised PV, inverter or battery
recommendation independently.
 Read only the final output and explicit assumptions from the authoritative assessment service.
 If asked to recalculate, redirect through an approved assessment-update and calculation
workflow.
 Distinguish kW, kVA and kWh; explain units clearly and do not equate them.
 Identify limits: shading, site survey, roof condition, surge loads, wiring and component
compatibility may change the final design.
 Escalate unusual load cases, conflicting inputs, missing calculation provenance and safetycritical questions.
 Regression-test assistant explanations against independent sample engineering cases and exact
stored values.
10. Financing workflow
Customers may explore financing before selecting an installer. The assistant must distinguish: (1)
indicative exploration, (2) customer-authorised preliminary enquiry, (3) provider eligibility checks,
(4) formal application with required installer/quotation documents, and (5) lender
approval/disbursement. Requirements vary by provider.
 Never claim guaranteed approval, rates, repayments or lender availability without current
verified data.
 Only send consented, minimum-necessary information to the customer-selected provider.
 Label estimated project costs as preliminary until a site survey and installer quotation are
confirmed.
 Never infer creditworthiness or make a credit decision on behalf of a lender.
11. Installer workflow and impartiality
 Display only active, genuinely verified partners as verified; distinguish demo data.
 Explain matching factors without fabricating score meanings or quality certifications.
 Disclose affiliated installers where applicable and avoid ownership-based ranking preference.
 Prevent installers from accessing competing installer enquiries, quotations or customer data.
 Require customer authorisation before sharing identifiable enquiries.
12. Identity, privacy, security and compliance
 Verify identity and resource ownership server-side for every private retrieval.
 Use least-privilege service accounts, encryption in transit and at rest, secret management and
secure logs.
 Implement session expiration, abuse throttling, input size limits and protection against prompt
injection.
 Record consent scope, timestamp, recipient, purpose, version and withdrawal mechanism as
appropriate.
 Establish retention, deletion, incident-response and processor arrangements; obtain Nigerian
legal review of NDPA and related obligations.
 Minimise sensitive data sent to AI providers and assess vendor retention and training settings.
 Provide clear AI disclosure and human escalation; do not claim professional certification or
lender approval.
13. Human escalation and operational ownership
Issue Route Handling expectation
Unclear engineering result Technical adviser Review engine inputs and
assumptions
Financing eligibility or terms Financing partner / operations Confirm only providersupplied facts
Installer complaint Customer operations Log case and investigate
Data access/privacy concern Privacy/security owner Restrict exposure and handle
securely
Chatbot failure Developer/on-call Monitor, triage, restore service
Assign a named product owner, engineering reviewer, operations owner and security owner.
Support ticket creation and partner handoffs must be auditable.
14. Non-functional requirements
 Mobile-first, responsive, screen-reader and keyboard accessible.
 Set measurable performance targets after load testing; show progress and graceful timeout
fallback.
 Implement uptime/error monitoring, alerting and cost controls per session and per user.
 Version all prompts, knowledge sources, API schemas and model deployments; support rollback.
 Capture anonymised helpfulness feedback and detect hallucinations, unsupported financial
claims and security incidents.
15. Analytics and launch metrics
Metric Definition
Chat engagement Sessions with at least one meaningful
interaction
Assessment assist rate Assessments receiving chatbot assistance
Assessment completion Completed / started assessments by cohort
Enquiry conversion Authorised enquiries / completed assessments
Human escalation Support escalations / chatbot sessions
Answer quality Reviewed grounded responses / sampled
responses
Safety incidents Unauthorised disclosures or unsupported
promises
Unit economics AI and support cost per assisted conversion
16. Delivery phases
Phase Scope Release gate
1: Guided assistance FAQ, assessment help, support,
analytics
FAQ quality, safe fallback,
responsive UX
2: Personalised results Authentication, assessment
API, explanations
Zero cross-user access;
numeric fidelity tests pass
3: Marketplace integration Verified partners, consented
referrals, project status
Partner data verified; consent
and action audit pass
17. QA test plan
 Ask general solar questions and verify approved sources and uncertainty handling.
 Attempt to retrieve another customer’s assessment by changing ID; request must fail.
 Compare every numeric output in assistant answer to assessment-engine API values.
 Ask for guaranteed financing approval or invented rates; assistant must refuse to fabricate.
 Test financing without installer selection; assistant must allow preliminary exploration.
 Test absent installer/finance partner data; no fictional active providers shown.
 Test prompt-injection strings inside retrieved content; tool and access boundaries remain
enforced.
 Test consent-denied referral; no partner data transfer occurs.
 Simulate service outage, slow response and support-ticket failure; accurate fallback appears.
 Test mobile widths, keyboard navigation, screen readers, privacy notices and transcript
retention.
18. Definition of done and implementation handover
 Approved UX copy and wireframes for mobile and desktop.
 API contracts and data schemas confirmed against existing SolarVy services.
 Knowledge-base ownership and update process documented.
 Security/privacy review, threat model and access-control tests completed.
 Engineering reviewer signs off numeric-fidelity and safety tests.
 Operations team trained on support and partner escalation.
 Pilot monitoring dashboard live; rollback procedure rehearsed.
19. Decisions required from SolarVy
 Confirm website/backend technology stack and authentication approach.
 Confirm where assessment calculations and result records are stored.
 Confirm current installer and financing partner verification and data models.
 Confirm customer support channel, staffing and operating hours.
 Approve AI provider, data processing terms, budget, retention policy and launch timetable.
End of specification. This document defines recommended requirements; it does not assert that
these systems, partnerships or controls are already implemented.