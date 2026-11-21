import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock,
  FileText,
  FolderOpen,
  Lightbulb,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MarketingNav from "../components/MarketingNav";
import PageSeo from "../components/PageSeo";
import { useAuth } from "../context/AuthContext";
import {
  financingStatusLabel,
  normalizeFinancingStatus,
  projectActionStatusLabel,
  FINANCING_STATUS_LABELS,
  type FinancingStatus,
} from "../lib/adminApi";
import { formatNaira, formatNairaShort } from "../lib/financing";
import {
  getProjectsWorkspace,
  type CustomerProject,
  type ProjectInstaller,
  type ProjectsWorkspace,
} from "../lib/projectsApi";
import "../css/projects-page.css";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOneDecimal(value: number | null | undefined, unit: string) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(Math.round(value * 10) / 10).toLocaleString("en-NG")} ${unit}`;
}

function locationLabel(project: CustomerProject) {
  return [project.location.city, project.location.state, project.location.country]
    .filter(Boolean)
    .join(", ");
}

type JourneyStep = { key: string; label: string; done: boolean };

function getJourney(project: CustomerProject): JourneyStep[] {
  const p = project.progress;
  return [
    { key: "assessment", label: "Assessment", done: true },
    { key: "results", label: "Results", done: p.resultsViewed },
    { key: "installers", label: "Installers", done: p.installersViewed },
    {
      key: "requests",
      label: "Requests",
      done: p.requestedIntro || p.requestedExpertReview || p.uploadedQuote,
    },
    { key: "financing", label: "Financing", done: p.requestedFinancing },
  ];
}

function completedCount(steps: JourneyStep[]) {
  return steps.filter((s) => s.done).length;
}

function currentStepIndex(steps: JourneyStep[]) {
  const idx = steps.findIndex((s) => !s.done);
  return idx === -1 ? steps.length : idx;
}

function nextAction(project: CustomerProject): { label: string; to: string } {
  const ref = encodeURIComponent(project.assessmentRef);
  const p = project.progress;
  if (!p.resultsViewed)
    return { label: "View results", to: `/assessment-result?assessment=${ref}` };
  if (!p.installersViewed)
    return {
      label: "See matched installers",
      to: `/matched-installers?assessment=${ref}`,
    };
  if (!(p.requestedIntro || p.requestedExpertReview || p.uploadedQuote))
    return {
      label: "Request an introduction",
      to: `/matched-installers?assessment=${ref}`,
    };
  if (!p.requestedFinancing)
    return {
      label: "Explore financing",
      to: `/explore-financing?assessment=${ref}`,
    };
  return { label: "View project details", to: `/projects/${ref}` };
}

function financingTone(status: string | null | undefined) {
  const normalized = normalizeFinancingStatus(status);
  if (normalized === "closed") return "neutral";
  if (normalized === "additional_information") return "warning";
  if (normalized === "offer_decision" || normalized === "customer_decision") {
    return "success";
  }
  return "info";
}

function actionTone(status: string | null | undefined) {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "info";
    case "awaiting_customer":
      return "warning";
    default:
      return "neutral";
  }
}

const FIN_TRACKER_STAGES: FinancingStatus[] = [
  "enquiry_submitted",
  "provider_review",
  "offer_decision",
  "customer_decision",
  "closed",
];

function financingStageIndex(status: string | null | undefined) {
  const normalized = normalizeFinancingStatus(status);
  if (normalized === "additional_information") {
    return FIN_TRACKER_STAGES.indexOf("provider_review");
  }
  return FIN_TRACKER_STAGES.indexOf(normalized);
}

type InstallerRequestState = {
  intro: string | null;
  review: string | null;
};

function installerRequestState(
  project: CustomerProject,
  installerName: string,
): InstallerRequestState {
  const name = installerName.trim().toLowerCase();
  const intro =
    project.requestIntros.find(
      (r) => (r.installerName || "").trim().toLowerCase() === name,
    )?.status || null;
  const review =
    project.expertReviews.find(
      (r) => (r.installerName || "").trim().toLowerCase() === name,
    )?.status || null;
  return { intro, review };
}

const ACTION_STATUS_HINT: Record<string, string> = {
  submitted: "Received. SolarVy will begin working on this shortly.",
  in_progress: "In progress. The installer or SolarVy team is on it.",
  awaiting_customer: "Action needed from you to keep things moving.",
  completed: "All done on this request.",
};

function actionStatusHint(status: string | null | undefined) {
  if (!status) return "";
  return ACTION_STATUS_HINT[status] || "";
}

type LiveStatus = {
  label: string;
  tone: "info" | "success" | "warning" | "neutral";
};

/** A single, customer-friendly status that reflects real movement on a project. */
function liveStatus(project: CustomerProject): LiveStatus {
  const actions = [
    ...project.requestIntros,
    ...project.expertReviews,
    ...project.quoteUploads,
  ];

  if (actions.some((a) => a.status === "awaiting_customer")) {
    return { label: "Action needed", tone: "warning" };
  }

  const latestFinancing = project.financing[0] || null;
  if (latestFinancing) {
    return {
      label: financingStatusLabel(latestFinancing.status),
      tone: financingTone(latestFinancing.status),
    };
  }

  if (actions.some((a) => a.status === "in_progress")) {
    return { label: "In progress", tone: "info" };
  }
  if (actions.length && actions.every((a) => a.status === "completed")) {
    return { label: "Completed", tone: "success" };
  }

  const steps = getJourney(project);
  const complete = completedCount(steps) >= steps.length;
  return {
    label: complete ? "All steps done" : "In progress",
    tone: complete ? "success" : "info",
  };
}

function firstName(fullName: string | null | undefined) {
  return fullName?.trim() ? fullName.trim().split(/\s+/)[0] : "";
}

function greetingTitle(
  workspace: ProjectsWorkspace | null,
  authUserName: string | null | undefined,
) {
  const name = firstName(workspace?.viewer.fullName || authUserName);
  if (!workspace) return "Your solar projects";
  if (name) return `Welcome back, ${name}`;
  return workspace.viewer.isGuest ? "Your solar projects" : "Welcome back";
}

/* ---------------------------------------------------------------- */
/* Shared presentational pieces                                     */
/* ---------------------------------------------------------------- */

function JourneyStepper({
  project,
  size = "sm",
}: {
  project: CustomerProject;
  size?: "sm" | "lg";
}) {
  const steps = getJourney(project);
  const current = currentStepIndex(steps);
  const done = completedCount(steps);
  const pct =
    steps.length <= 1 ? 100 : (Math.max(0, done - 1) / (steps.length - 1)) * 100;

  return (
    <div className={`pw-journey pw-journey--${size}`}>
      <div className="pw-journey-track" aria-hidden>
        <span className="pw-journey-fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="pw-journey-steps">
        {steps.map((step, index) => {
          const state = step.done
            ? "done"
            : index === current
              ? "current"
              : "todo";
          const stateLabel =
            state === "done"
              ? "completed"
              : state === "current"
                ? "in progress"
                : "not started";
          return (
            <li
              key={step.key}
              className={`pw-journey-step is-${state}`}
              aria-label={`${step.label}: ${stateLabel}`}
            >
              <span className="pw-journey-node" aria-hidden>
                {step.done ? <Check size={size === "lg" ? 15 : 12} /> : index + 1}
              </span>
              <span className="pw-journey-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "warning" | "neutral";
}) {
  return <span className={`pw-pill pw-pill--${tone}`}>{label}</span>;
}

function FinancialChart({
  cost,
  annualSavings,
  paybackYears,
}: {
  cost: number;
  annualSavings: number;
  paybackYears: number | null;
}) {
  const span = Math.max(
    10,
    Math.ceil((paybackYears && paybackYears > 0 ? paybackYears : 8) * 1.4),
  );
  const data = Array.from({ length: span + 1 }, (_, year) => ({
    year,
    savings: Math.round(annualSavings * year),
  }));

  return (
    <div className="pw-chart">
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="pwSavings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5921e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f5921e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            tickFormatter={(v) => `${v}y`}
            tick={{ fontSize: 11, fill: "#8a93a6" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatNairaShort(v) || `${v}`}
            tick={{ fontSize: 11, fill: "#8a93a6" }}
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) =>
              [
                formatNaira(Number(value)) || String(value),
                "Cumulative savings",
              ] as [string, string]
            }
            labelFormatter={(label) => `Year ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e6ecf5",
              fontSize: 12,
            }}
          />
          <ReferenceLine
            y={cost}
            stroke="#234f8e"
            strokeDasharray="5 4"
            label={{
              value: "System cost",
              position: "insideTopRight",
              fontSize: 11,
              fill: "#234f8e",
            }}
          />
          <Area
            type="monotone"
            dataKey="savings"
            stroke="#f5921e"
            strokeWidth={2.5}
            fill="url(#pwSavings)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="pw-chart-note">
        Estimated cumulative savings versus your system cost
        {paybackYears && paybackYears > 0
          ? `. Break-even near year ${Math.round(paybackYears)}.`
          : "."}
      </p>
    </div>
  );
}

function FinancingTracker({ status }: { status: string | null | undefined }) {
  const normalized = normalizeFinancingStatus(status);
  const current = financingStageIndex(status);
  const needsInfo = normalized === "additional_information";

  return (
    <div className="pw-fin-tracker">
      <ol className="pw-fin-steps">
        {FIN_TRACKER_STAGES.map((stage, index) => {
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li key={stage} className={`pw-fin-step is-${state}`}>
              <span className="pw-fin-node" aria-hidden>
                {index < current ? <Check size={12} /> : index + 1}
              </span>
              <span className="pw-fin-label">
                {FINANCING_STATUS_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ol>
      {needsInfo ? (
        <p className="pw-fin-note">
          The provider has requested additional information to continue your
          review.
        </p>
      ) : null}
    </div>
  );
}

function InstallerRow({
  installer,
  project,
}: {
  installer: ProjectInstaller;
  project: CustomerProject;
}) {
  const { intro, review } = installerRequestState(
    project,
    installer.installerName,
  );
  return (
    <li className="pw-installer">
      <div className="pw-installer-main">
        <strong>{installer.installerName}</strong>
        <p className="pw-muted">
          {installer.bestSuitedFor ||
            installer.strengths ||
            "Matched to your assessment."}
        </p>
        {intro || review ? (
          <div className="pw-installer-chips">
            {intro ? (
              <StatusPill
                label={`Intro · ${projectActionStatusLabel(intro)}`}
                tone={actionTone(intro)}
              />
            ) : null}
            {review ? (
              <StatusPill
                label={`Review · ${projectActionStatusLabel(review)}`}
                tone={actionTone(review)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {installer.matchPct != null ? (
        <span className="pw-match">
          {Math.round(installer.matchPct)}%<small>match</small>
        </span>
      ) : null}
    </li>
  );
}

function ProjectCard({ project }: { project: CustomerProject }) {
  const steps = getJourney(project);
  const done = completedCount(steps);
  const action = nextAction(project);
  const complete = done >= steps.length;
  const status = liveStatus(project);

  return (
    <article className="pw-card pw-project-card">
      <div className="pw-project-card-head">
        <div className="pw-project-card-heading">
          <span className="pw-ref">{project.assessmentRef}</span>
          <h3 className="pw-project-title">
            <MapPin size={16} aria-hidden />
            {locationLabel(project) || "Solar project"}
          </h3>
          <p className="pw-project-sub">
            Submitted {formatDate(project.createdAt)}
            {project.propertyType ? ` · ${project.propertyType}` : ""}
          </p>
        </div>
        <StatusPill label={status.label} tone={status.tone} />
      </div>

      <div className="pw-mini-kpis">
        <div>
          <span>Est. cost</span>
          <strong>
            {formatNairaShort(project.snapshot.estimatedSystemCost) || "—"}
          </strong>
        </div>
        <div>
          <span>Annual savings</span>
          <strong>
            {formatNairaShort(project.snapshot.netAnnualSavings) || "—"}
          </strong>
        </div>
        <div>
          <span>Installers</span>
          <strong>{project.installers.count}</strong>
        </div>
      </div>

      <JourneyStepper project={project} />

      <div className="pw-project-card-foot">
        <span className="pw-muted pw-foot-meta">
          <Clock size={13} aria-hidden /> {done} of {steps.length} steps ·{" "}
          {formatDateTime(project.latestActivityAt)}
        </span>
        <div className="pw-card-ctas">
          {!complete ? (
            <Link className="pw-btn pw-btn-ghost" to={action.to}>
              {action.label}
            </Link>
          ) : null}
          <Link
            className="pw-btn pw-btn-primary"
            to={`/projects/${encodeURIComponent(project.assessmentRef)}`}
          >
            View project <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatBand({ workspace }: { workspace: ProjectsWorkspace | null }) {
  const s = workspace?.summary;
  const items = [
    {
      key: "projects",
      label: "Projects",
      value: s?.totalProjects ?? 0,
      icon: <FolderOpen size={18} aria-hidden />,
    },
    {
      key: "intros",
      label: "Installer requests",
      value: s?.totalRequestIntros ?? 0,
      icon: <Users size={18} aria-hidden />,
    },
    {
      key: "reviews",
      label: "Expert reviews",
      value: s?.totalExpertReviews ?? 0,
      icon: <Star size={18} aria-hidden />,
    },
    {
      key: "financing",
      label: "Financing enquiries",
      value: s?.totalFinancingEnquiries ?? 0,
      icon: <Wallet size={18} aria-hidden />,
    },
  ];
  return (
    <div className="pw-stat-band">
      {items.map((item) => (
        <article className="pw-stat-card" key={item.key}>
          <span className="pw-stat-icon">{item.icon}</span>
          <span className="pw-stat-meta">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </span>
        </article>
      ))}
    </div>
  );
}

function GuestBanner() {
  return (
    <div className="pw-guest-banner">
      <span className="pw-guest-icon" aria-hidden>
        <Lightbulb size={18} />
      </span>
      <div className="pw-guest-copy">
        <strong>You are tracking as a guest on this device.</strong>
        <p>
          Create a free account to keep your projects safe and access them from
          any device.
        </p>
      </div>
      <div className="pw-guest-ctas">
        <Link className="pw-btn pw-btn-primary" to="/signup">
          Create account
        </Link>
        <Link className="pw-btn pw-btn-ghost" to="/login">
          Log in
        </Link>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="pw-card pw-skeleton-card" aria-hidden>
      <div className="pw-skel pw-skel-line" style={{ width: "40%" }} />
      <div className="pw-skel pw-skel-line" style={{ width: "70%" }} />
      <div className="pw-skel-row">
        <div className="pw-skel pw-skel-block" />
        <div className="pw-skel pw-skel-block" />
        <div className="pw-skel pw-skel-block" />
      </div>
      <div className="pw-skel pw-skel-line" style={{ width: "100%" }} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Detail view                                                      */
/* ---------------------------------------------------------------- */

function ProjectDetail({ project }: { project: CustomerProject }) {
  const latestFinancing = project.financing[0] || null;
  const ref = encodeURIComponent(project.assessmentRef);

  const kpis = [
    {
      label: "System size",
      value: formatOneDecimal(project.snapshot.recommendedSolarKwp, "kWp"),
    },
    {
      label: "Battery",
      value: formatOneDecimal(project.snapshot.recommendedBatteryKwh, "kWh"),
    },
    {
      label: "Estimated cost",
      value: formatNaira(project.snapshot.estimatedSystemCost) || "—",
    },
    {
      label: "Annual savings",
      value: formatNaira(project.snapshot.netAnnualSavings) || "—",
    },
    {
      label: "Payback",
      value: formatOneDecimal(project.snapshot.simplePaybackYears, "yrs"),
    },
  ];

  return (
    <div className="pw-detail">
      <div className="pw-detail-back">
        <Link className="pw-inline-link" to="/projects">
          <ArrowRight size={14} className="pw-flip" aria-hidden /> All projects
        </Link>
        <span className="pw-muted">
          Updated {formatDateTime(project.latestActivityAt)}
        </span>
      </div>

      <div className="pw-detail-layout">
        <div className="pw-detail-main">
          <section className="pw-card pw-hero-card">
            <div className="pw-hero-card-head">
              <div>
                <span className="pw-ref">{project.assessmentRef}</span>
                <h2 className="pw-hero-title">
                  <MapPin size={18} aria-hidden />
                  {locationLabel(project) || "Solar project"}
                </h2>
                <p className="pw-muted">
                  Submitted {formatDate(project.createdAt)}
                  {project.propertyType ? ` · ${project.propertyType}` : ""}
                </p>
              </div>
              <StatusPill
                label={liveStatus(project).label}
                tone={liveStatus(project).tone}
              />
            </div>

            {project.snapshot.calculationError ? (
              <div className="pw-warning">
                {project.snapshot.calculationError}
              </div>
            ) : null}

            <div className="pw-kpi-grid">
              {kpis.map((kpi) => (
                <div className="pw-kpi" key={kpi.label}>
                  <span>{kpi.label}</span>
                  <strong>{kpi.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="pw-card">
            <h2 className="pw-section-title">Project journey</h2>
            <JourneyStepper project={project} size="lg" />
          </section>

          {project.snapshot.estimatedSystemCost &&
          project.snapshot.estimatedSystemCost > 0 &&
          project.snapshot.netAnnualSavings &&
          project.snapshot.netAnnualSavings > 0 ? (
            <section className="pw-card">
              <h2 className="pw-section-title">Financial outlook</h2>
              <FinancialChart
                cost={project.snapshot.estimatedSystemCost}
                annualSavings={project.snapshot.netAnnualSavings}
                paybackYears={project.snapshot.simplePaybackYears}
              />
            </section>
          ) : null}

          <section className="pw-card">
            <h2 className="pw-section-title">
              Matched installers{" "}
              <span className="pw-count">{project.installers.count}</span>
            </h2>
            {project.installers.items.length ? (
              <ul className="pw-installer-list">
                {project.installers.items.slice(0, 4).map((inst, i) => (
                  <InstallerRow
                    key={`${inst.installerName}-${i}`}
                    installer={inst}
                    project={project}
                  />
                ))}
              </ul>
            ) : (
              <p className="pw-muted">
                Installer matches will appear here once they are generated.
              </p>
            )}
            <Link
              className="pw-btn pw-btn-ghost pw-mt"
              to={`/matched-installers?assessment=${ref}`}
            >
              View all installers <ArrowRight size={14} aria-hidden />
            </Link>
          </section>

          <section className="pw-card">
            <h2 className="pw-section-title">Your requests</h2>
            <div className="pw-request-grid">
              <RequestTile
                icon={<Users size={16} aria-hidden />}
                label="Introductions"
                count={project.requestIntros.length}
                latest={
                  project.requestIntros[0]
                    ? `${project.requestIntros[0].installerName}`
                    : null
                }
                status={project.requestIntros[0]?.status}
              />
              <RequestTile
                icon={<Sparkles size={16} aria-hidden />}
                label="Expert reviews"
                count={project.expertReviews.length}
                latest={
                  project.expertReviews[0]
                    ? project.expertReviews[0].installerName
                    : null
                }
                status={project.expertReviews[0]?.status}
              />
              <RequestTile
                icon={<Upload size={16} aria-hidden />}
                label="Quote uploads"
                count={project.quoteUploads.length}
                latest={project.quoteUploads[0]?.fileName || null}
                status={project.quoteUploads[0]?.status}
              />
              <RequestTile
                icon={<Wallet size={16} aria-hidden />}
                label="Financing"
                count={project.financing.length}
                latest={latestFinancing?.reference || null}
                status={
                  latestFinancing
                    ? financingStatusLabel(latestFinancing.status)
                    : undefined
                }
                rawStatusTone={
                  latestFinancing
                    ? financingTone(latestFinancing.status)
                    : undefined
                }
              />
            </div>
          </section>

          {latestFinancing ? (
            <section className="pw-card">
              <h2 className="pw-section-title">Financing progress</h2>
              <p className="pw-muted pw-mb">
                {latestFinancing.partnerName} · {latestFinancing.reference}
              </p>
              <FinancingTracker status={latestFinancing.status} />
            </section>
          ) : null}

          <section className="pw-card">
            <h2 className="pw-section-title">Activity timeline</h2>
            {project.timeline.length ? (
              <ol className="pw-timeline">
                {project.timeline.map((item) => (
                  <li key={`${item.kind}-${item.timestamp}-${item.title}`}>
                    <span className="pw-timeline-dot" aria-hidden />
                    <div className="pw-timeline-body">
                      <div className="pw-timeline-top">
                        <strong>{item.title}</strong>
                        <span className="pw-muted">
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="pw-muted">{item.description}</p>
                      {["request_intro", "expert_review", "quote_upload"].includes(
                        item.kind,
                      ) && actionStatusHint(item.status) ? (
                        <p className="pw-timeline-hint">
                          {actionStatusHint(item.status)}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="pw-muted">No activity recorded yet.</p>
            )}
          </section>
        </div>

        <aside className="pw-detail-side">
          <section className="pw-card pw-side-card">
            <h2 className="pw-section-title">Next steps</h2>
            <div className="pw-side-ctas">
              <Link
                className="pw-btn pw-btn-primary"
                to={nextAction(project).to}
              >
                {nextAction(project).label} <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                className="pw-btn pw-btn-ghost"
                to={`/assessment-result?assessment=${ref}`}
              >
                <FileText size={15} aria-hidden /> View assessment
              </Link>
              <Link
                className="pw-btn pw-btn-ghost"
                to={`/matched-installers?assessment=${ref}`}
              >
                <Users size={15} aria-hidden /> Matched installers
              </Link>
              <Link
                className="pw-btn pw-btn-ghost"
                to={`/explore-financing?assessment=${ref}`}
              >
                <Wallet size={15} aria-hidden /> Explore financing
              </Link>
            </div>
          </section>

          {latestFinancing ? (
            <section className="pw-card pw-side-card">
              <h2 className="pw-section-title">Latest financing</h2>
              <p className="pw-side-strong">{latestFinancing.partnerName}</p>
              <p className="pw-muted">
                {latestFinancing.reference} ·{" "}
                {financingStatusLabel(latestFinancing.status)}
              </p>
              <dl className="pw-side-list">
                <div>
                  <dt>Route</dt>
                  <dd>{latestFinancing.routeLabel || "—"}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatNaira(latestFinancing.amountToFinance) || "—"}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>
                    {formatDateTime(
                      latestFinancing.statusUpdatedAt ||
                        latestFinancing.submittedAt,
                    )}
                  </dd>
                </div>
              </dl>
              <Link
                className="pw-btn pw-btn-primary"
                to={`/financing-status?assessment=${ref}`}
              >
                Open financing status
              </Link>
            </section>
          ) : null}

          <section className="pw-card pw-side-card pw-support-card">
            <h2 className="pw-section-title">Need a hand?</h2>
            <p className="pw-muted">
              Our team can help you understand your results or next steps.
            </p>
            <Link className="pw-btn pw-btn-ghost" to="/contact">
              Contact SolarVy
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RequestTile({
  icon,
  label,
  count,
  latest,
  status,
  rawStatusTone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  latest: string | null;
  status?: string;
  rawStatusTone?: "info" | "success" | "warning" | "neutral";
}) {
  const statusLabel =
    status && rawStatusTone
      ? status
      : status
        ? projectActionStatusLabel(status)
        : null;
  const tone = rawStatusTone || (status ? actionTone(status) : "neutral");
  return (
    <div className="pw-request-tile">
      <div className="pw-request-tile-head">
        <span className="pw-request-icon">{icon}</span>
        <strong className="pw-request-count">{count}</strong>
      </div>
      <span className="pw-request-label">{label}</span>
      {latest ? (
        <p className="pw-muted pw-request-latest">{latest}</p>
      ) : (
        <p className="pw-muted pw-request-latest">None yet</p>
      )}
      {statusLabel ? <StatusPill label={statusLabel} tone={tone} /> : null}
      {status && !rawStatusTone && actionStatusHint(status) ? (
        <p className="pw-request-hint">{actionStatusHint(status)}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                             */
/* ---------------------------------------------------------------- */

export default function ProjectsPage() {
  const { assessmentRef } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<ProjectsWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await getProjectsWorkspace();
        if (!cancelled) setWorkspace(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load your projects.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedProject = useMemo(() => {
    if (!assessmentRef || !workspace) return null;
    return (
      workspace.projects.find(
        (project) =>
          project.assessmentRef.toUpperCase() === assessmentRef.toUpperCase(),
      ) || null
    );
  }, [assessmentRef, workspace]);

  const hasProjects = Boolean(workspace?.projects.length);
  const hasOtherActions = Boolean(
    workspace &&
      (workspace.otherActions.requestIntros.length ||
        workspace.otherActions.expertReviews.length ||
        workspace.otherActions.quoteUploads.length ||
        workspace.otherActions.financing.length),
  );
  const loading = isLoading || authLoading;
  const isGuest = Boolean(workspace?.viewer.isGuest);

  return (
    <div className="pw-page">
      <PageSeo
        title="Projects | SolarVy"
        description="Track your assessments, installers, financing, and follow-up requests in one SolarVy project space."
        path="/projects"
      />

      <section className="hero d-flex align-items-center ass-bannr py-4">
        <div className="overlay"></div>
        <div className="container-fluid px-lg-4 px-3 position-relative z-1 menu-div ass-div">
          <div className="row align-items-start text-divs gx-3 gx-lg-4">
            <MarketingNav />
            <div className="nav-bottom-section row align-items-center">
              <div className="col-12 text-white pw-hero-copy">
                <h1 className="pw-hero-heading">
                  {greetingTitle(workspace, user?.fullName)}
                </h1>
                <p className="pw-hero-text">
                  Follow every assessment from results to installers, financing,
                  and the requests you have submitted.
                </p>
                {workspace && !isGuest && workspace.viewer.scope === "account" ? (
                  <span className="pw-hero-chip">
                    <Check size={13} aria-hidden /> Synced across your devices
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="pw-body">
        <div className="pw-container">
          {isGuest ? <GuestBanner /> : null}

          {!loading && !error ? <StatBand workspace={workspace} /> : null}

          {loading ? (
            <div className="pw-card-list">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : error ? (
            <div className="pw-card pw-state">
              <p className="pw-error">{error}</p>
            </div>
          ) : !hasProjects && !hasOtherActions ? (
            <div className="pw-card pw-empty">
              <span className="pw-empty-icon" aria-hidden>
                <FolderOpen size={26} />
              </span>
              <h2>No projects yet</h2>
              <p>
                Start a SolarVy assessment to create your first project and track
                every next step right here.
              </p>
              <div className="pw-empty-ctas">
                <Link className="pw-btn pw-btn-primary" to="/start-assessment">
                  <Plus size={16} aria-hidden /> Start assessment
                </Link>
                <Link className="pw-btn pw-btn-ghost" to="/how-it-works">
                  See how it works
                </Link>
              </div>
            </div>
          ) : assessmentRef && !selectedProject ? (
            <div className="pw-card pw-empty">
              <h2>Project not found</h2>
              <p>We could not find that assessment in this project space.</p>
              <div className="pw-empty-ctas">
                <Link className="pw-btn pw-btn-primary" to="/projects">
                  Back to all projects
                </Link>
              </div>
            </div>
          ) : selectedProject ? (
            <ProjectDetail project={selectedProject} />
          ) : (
            <>
              <div className="pw-section-head">
                <h2 className="pw-list-title">Your projects</h2>
                <Link className="pw-btn pw-btn-ghost" to="/start-assessment">
                  <Plus size={16} aria-hidden /> New assessment
                </Link>
              </div>
              <div className="pw-card-list">
                {workspace?.projects.map((project) => (
                  <ProjectCard key={project.assessmentRef} project={project} />
                ))}
              </div>

              {hasOtherActions ? (
                <section className="pw-card pw-other">
                  <h2 className="pw-section-title">Other saved activity</h2>
                  <p className="pw-muted">
                    These requests were saved but are not yet linked to a tracked
                    assessment.
                  </p>
                  <div className="pw-other-grid">
                    <OtherStat
                      icon={<Users size={16} aria-hidden />}
                      label="Introductions"
                      value={workspace?.otherActions.requestIntros.length ?? 0}
                    />
                    <OtherStat
                      icon={<Sparkles size={16} aria-hidden />}
                      label="Expert reviews"
                      value={workspace?.otherActions.expertReviews.length ?? 0}
                    />
                    <OtherStat
                      icon={<Upload size={16} aria-hidden />}
                      label="Quote uploads"
                      value={workspace?.otherActions.quoteUploads.length ?? 0}
                    />
                    <OtherStat
                      icon={<Wallet size={16} aria-hidden />}
                      label="Financing"
                      value={workspace?.otherActions.financing.length ?? 0}
                    />
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OtherStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="pw-other-stat">
      <span className="pw-request-icon">{icon}</span>
      <strong>{value}</strong>
      <span className="pw-muted">{label}</span>
    </div>
  );
}
