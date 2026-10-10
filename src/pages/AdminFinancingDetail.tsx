import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FINANCING_STATUS_LABELS,
  FINANCING_STATUS_ORDER,
  adminGetFinancingEnquiry,
  adminUpdateFinancingEnquiry,
  financingStatusLabel,
  type AdminFinancingEnquiry,
  type FinancingStatus,
} from "../lib/adminApi";
import { formatNaira } from "../lib/financing";

const NOTES_MAX_LENGTH = 5000;

const STATUS_HINTS: Record<FinancingStatus, string> = {
  new: "Submitted, not yet looked at.",
  in_review: "Admin is checking the request.",
  sent_to_partner: "Forwarded to the financing partner.",
  closed: "No further action needed.",
};

function valueOrDash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatSize(value: number | null | undefined, unit: string) {
  if (value == null || !Number.isFinite(value)) return null;
  return `${(Math.round(value * 10) / 10).toLocaleString("en-NG")} ${unit}`;
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="admin-info-row">
      <dt>{label}</dt>
      <dd>{valueOrDash(value)}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`admin-fin-status admin-fin-status--${status}`}>
      {financingStatusLabel(status)}
    </span>
  );
}

export default function AdminFinancingDetail() {
  const { id = "", financingId = "" } = useParams();
  const [record, setRecord] = useState<AdminFinancingEnquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<FinancingStatus>("new");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminGetFinancingEnquiry(financingId, {
          visitorId: id,
        });
        if (cancelled) return;
        setRecord(data);
        setStatus(data.status);
        setNotes(data.adminNotes || "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load financing",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, financingId]);

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading financing enquiry…</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">
          {error || "Financing enquiry not found"}
        </div>
        <Link to={`/admin/users/${id}`} className="admin-btn admin-btn-secondary">
          Back to user
        </Link>
      </div>
    );
  }

  const project = record.projectSnapshot || {};
  const partner = record.partnerSnapshot || {};
  const requirements = Array.isArray(partner.requirements)
    ? partner.requirements
    : [];
  const projectCost = project.estimatedSystemCost ?? null;
  const financedShare =
    projectCost && record.amountToFinance
      ? Math.round((record.amountToFinance / projectCost) * 1000) / 10
      : null;
  const solar = formatSize(project.recommendedSolarKwp, "kWp");
  const battery = formatSize(project.recommendedBatteryKwh, "kWh");
  const system = [solar, battery].filter(Boolean).join(" + ");
  const projectLocation = [project.city, project.state]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");
  const assessmentRef = record.assessmentRef || project.assessmentRef || null;

  const dirty =
    status !== record.status || notes.trim() !== (record.adminNotes || "");

  const kpis = [
    {
      label: "Amount requested",
      value: formatNaira(record.amountToFinance) || "—",
    },
    { label: "Deposit available", value: formatNaira(record.depositAvailable) || "—" },
    { label: "Estimated project cost", value: formatNaira(projectCost) || "—" },
    {
      label: "Financed share",
      value: financedShare != null ? `${financedShare}%` : "—",
    },
  ];

  const consents = [
    {
      label: "Agreed to share the enquiry and assessment details with financing partners",
      checked: record.consentShare,
    },
    {
      label: "Confirmed the information is correct and authorised SolarVy to send it",
      checked: record.confirmAccurate,
    },
    {
      label: "Understood the enquiry is not an approval or credit offer",
      checked: record.confirmTerms,
    },
  ];

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await adminUpdateFinancingEnquiry(
        record.id,
        { status, adminNotes: notes.trim() },
        { visitorId: id },
      );
      setRecord(updated);
      setStatus(updated.status);
      setNotes(updated.adminNotes || "");
      setSaveMessage({ tone: "success", text: "Review saved." });
    } catch (err) {
      setSaveMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Failed to save review",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-inner admin-fin-detail">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <p className="admin-eyebrow">Financing enquiry</p>
          <div className="admin-fin-title-row">
            <h1 className="admin-page-title">{record.reference}</h1>
            <StatusPill status={record.status} />
          </div>
          <p className="admin-page-subtitle admin-user-meta">
            Submitted {formatDateTime(record.createdAt)}
            {assessmentRef ? (
              <>
                <span className="admin-meta-sep">·</span>
                Assessment {assessmentRef}
              </>
            ) : null}
          </p>
        </div>
        <Link to={`/admin/users/${id}`} className="admin-btn admin-btn-secondary">
          Back to user
        </Link>
      </div>

      <div className="admin-kpi-grid admin-fin-kpis">
        {kpis.map((kpi) => (
          <div className="admin-kpi-card" key={kpi.label}>
            <p className="admin-kpi-label">{kpi.label}</p>
            <p className="admin-kpi-value">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-fin-layout">
        <div className="admin-fin-main">
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Financing request</h2>
            <dl className="admin-info-list admin-info-list-wide">
              <Field label="Applicant type" value={record.applicantType} />
              <Field
                label="Amount to finance"
                value={formatNaira(record.amountToFinance)}
              />
              <Field
                label="Deposit available"
                value={formatNaira(record.depositAvailable)}
              />
              <Field
                label="Repayment period"
                value={record.repaymentLabel || record.repaymentPeriod}
              />
              <Field label="Monthly income / revenue" value={record.incomeRange} />
              <Field label="Location" value={record.location} />
            </dl>
            <div className="admin-fin-notes">
              <span className="admin-fin-notes-label">Notes from the user</span>
              <p>{record.notes?.trim() ? record.notes : "No notes provided."}</p>
            </div>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Selected route &amp; partner</h2>
            <dl className="admin-info-list admin-info-list-wide">
              <Field label="Financing route" value={record.routeLabel || record.routeId} />
              <Field label="Partner" value={record.partnerName} />
              <Field label="Partner description" value={partner.description} />
            </dl>
            {requirements.length > 0 ? (
              <div className="admin-fin-checklist-block">
                <span className="admin-fin-notes-label">
                  Indicative requirements shown to the user
                </span>
                <ul className="admin-fin-checklist">
                  {requirements.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check2" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="admin-panel admin-detail-section">
            <div className="admin-fin-section-head">
              <h2 className="admin-panel-title">Project at submission</h2>
              {assessmentRef && record.assessmentId != null ? (
                <Link
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  to={`/admin/users/${id}/assessments/${assessmentRef}`}
                >
                  View assessment
                </Link>
              ) : null}
            </div>
            <dl className="admin-info-list admin-info-list-wide">
              <Field
                label="Assessment"
                value={assessmentRef || project.requestedAssessmentRef}
              />
              <Field label="Property type" value={project.propertyType} />
              <Field label="Project location" value={projectLocation} />
              <Field label="Recommended system" value={system} />
              <Field
                label="Estimated system cost"
                value={formatNaira(project.estimatedSystemCost)}
              />
              <Field
                label="Est. annual savings"
                value={formatNaira(project.netAnnualSavings)}
              />
            </dl>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Consent &amp; shared information</h2>
            <ul className="admin-fin-consents">
              {consents.map((item) => (
                <li
                  key={item.label}
                  className={item.checked ? "is-checked" : "is-missing"}
                >
                  <i
                    className={`bi ${item.checked ? "bi-check-circle-fill" : "bi-x-circle-fill"}`}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            {record.sharedItems.length > 0 ? (
              <div className="admin-fin-checklist-block">
                <span className="admin-fin-notes-label">
                  Information the user agreed to share
                </span>
                <ul className="admin-fin-checklist">
                  {record.sharedItems.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check2" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="admin-fin-aside">
          <section className="admin-panel admin-fin-review">
            <h2 className="admin-panel-title">Admin review</h2>
            <p className="admin-panel-lead">
              Track progress on this enquiry. The user does not see this.
            </p>

            <span className="admin-label">Status</span>
            <div
              className="admin-fin-status-options"
              role="radiogroup"
              aria-label="Review status"
            >
              {FINANCING_STATUS_ORDER.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={status === option}
                  className={`admin-fin-status-option admin-fin-status-option--${option}${
                    status === option ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setStatus(option);
                    setSaveMessage(null);
                  }}
                >
                  <span className="admin-fin-status-dot" aria-hidden />
                  <span className="admin-fin-status-option-copy">
                    <strong>{FINANCING_STATUS_LABELS[option]}</strong>
                    <small>{STATUS_HINTS[option]}</small>
                  </span>
                </button>
              ))}
            </div>

            <label className="admin-label" htmlFor="admin-fin-notes">
              Internal notes
            </label>
            <textarea
              id="admin-fin-notes"
              className="admin-prompt-textarea admin-fin-notes-input"
              value={notes}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="e.g. Called the user, waiting on bank statements…"
              onChange={(e) => {
                setNotes(e.target.value);
                setSaveMessage(null);
              }}
            />
            <p className="admin-file-meta admin-fin-notes-count">
              {notes.length} / {NOTES_MAX_LENGTH}
            </p>

            {saveMessage ? (
              <p
                className={`admin-fin-save-msg admin-fin-save-msg--${saveMessage.tone}`}
                role={saveMessage.tone === "error" ? "alert" : "status"}
              >
                {saveMessage.text}
              </p>
            ) : null}

            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-block"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save review"}
            </button>

            <dl className="admin-fin-meta">
              <div>
                <dt>Status changed</dt>
                <dd>{formatDateTime(record.statusUpdatedAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateTime(record.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <p className="admin-fin-snapshot-note">
            <i className="bi bi-lock" aria-hidden />
            Details on this page are stored exactly as the user submitted them,
            so later changes to partners, routes or assessment data won't alter
            this record.
          </p>
        </aside>
      </div>
    </div>
  );
}
