import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminGetRequestIntro,
  adminUpdateRequestIntro,
  type AdminInstallerSnapshot,
  type AdminRequestIntro,
  type ProjectActionStatus,
  projectActionStatusLabel,
} from "../lib/adminApi";
import AdminActionStatusPanel from "../components/AdminActionStatusPanel";
import {
  downloadRequestIntroReport,
  formatLeadReportDate,
} from "../lib/leadRequestIntroReportPdf";
import {
  resolveLeadInstaller,
  type ResolvedLeadInstaller,
} from "../lib/leadInstallerResolve";

function valueOrDash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function Field({
  label,
  value,
  hideEmpty = false,
}: {
  label: string;
  value: unknown;
  hideEmpty?: boolean;
}) {
  const empty = value == null || String(value).trim() === "";
  if (hideEmpty && empty) return null;
  return (
    <div className="admin-info-row">
      <dt>{label}</dt>
      <dd>{empty ? "—" : String(value)}</dd>
    </div>
  );
}

function InstallerChips({
  snap,
  matchPct,
}: {
  snap: AdminInstallerSnapshot | null;
  matchPct: number | null;
}) {
  const chips = [
    matchPct != null && Number.isFinite(matchPct)
      ? `${Math.round(matchPct)}% match`
      : null,
    snap?.matchTier,
    snap?.coverage,
    snap?.pricing,
    snap?.response,
  ].filter(Boolean) as string[];

  if (!chips.length) return null;
  return (
    <div className="admin-lead-chip-row">
      {chips.map((chip) => (
        <span key={chip} className="admin-lead-chip">
          {chip}
        </span>
      ))}
    </div>
  );
}

export default function AdminRequestIntroDetail() {
  const { id = "", leadId = "" } = useParams();
  const [record, setRecord] = useState<AdminRequestIntro | null>(null);
  const [installer, setInstaller] = useState<ResolvedLeadInstaller | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminGetRequestIntro(leadId, { visitorId: id });
        if (cancelled) return;
        setRecord(data);
        const resolved = await resolveLeadInstaller({
          visitorId: data.visitorId || id,
          leadCreatedAt: data.createdAt,
          cta: "request_intro",
          existingName: data.installerName,
          existingSnapshot: data.installerSnapshot,
          existingMatchPct: data.matchPct,
          assessmentId: data.assessmentId,
        });
        if (!cancelled) setInstaller(resolved);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load request intro",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, leadId]);

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading request intro…</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">
          {error || "Request intro not found"}
        </div>
        <Link to={`/admin/users/${id}`} className="admin-btn admin-btn-secondary">
          Back to user
        </Link>
      </div>
    );
  }

  const snap = installer?.snapshot ?? record.installerSnapshot;
  const matchPct = installer?.matchPct ?? record.matchPct;
  const installerName = installer?.installerName || record.installerName;
  const summaryItems = Array.isArray(record.projectSummary)
    ? record.projectSummary
    : [];

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const pdfRecord: AdminRequestIntro = {
        ...record,
        installerName: installerName || record.installerName,
        installerSnapshot: snap,
        matchPct,
      };
      await downloadRequestIntroReport({
        record: pdfRecord,
        generatedDate: formatLeadReportDate(),
      });
    } catch {
      setDownloadError("Unable to generate the PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="admin-page-inner admin-fin-detail admin-lead-detail">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <p className="admin-eyebrow">Request introduction</p>
          <h1 className="admin-page-title">
            {valueOrDash(record.fullName)} · #{record.id}
          </h1>
          <p className="admin-page-subtitle admin-user-meta">
            Submitted {formatDateTime(record.createdAt)}
            {record.assessmentRef ? (
              <>
                <span className="admin-meta-sep">·</span>
                Assessment {record.assessmentRef}
              </>
            ) : null}
          </p>
        </div>
        <div className="admin-header-actions">
          <Link
            to={`/admin/users/${id}`}
            className="admin-btn admin-btn-secondary"
          >
            Back to user
          </Link>
          <Link to="/admin/leads" className="admin-btn admin-btn-secondary">
            All leads
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={isDownloading}
            onClick={() => void handleDownload()}
          >
            {isDownloading ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      </div>

      {downloadError ? (
        <div className="admin-panel admin-alert">{downloadError}</div>
      ) : null}

      <div className="admin-lead-detail-grid">
        <AdminActionStatusPanel
          key={`${record.status}-${record.statusUpdatedAt ?? ""}`}
          status={record.status}
          adminNotes={record.adminNotes ?? ""}
          statusUpdatedAt={record.statusUpdatedAt}
          updatedAt={record.updatedAt}
          emailHint="Changing the status emails the customer and updates their project space."
          onSave={async (next: {
            status: ProjectActionStatus;
            adminNotes: string;
          }) => {
            const updated = await adminUpdateRequestIntro(record.id, next, {
              visitorId: id,
            });
            setRecord((prev) =>
              prev
                ? {
                    ...prev,
                    status: updated.status,
                    adminNotes: updated.adminNotes,
                    statusUpdatedAt: updated.statusUpdatedAt,
                    updatedAt: updated.updatedAt,
                  }
                : updated,
            );
          }}
        />

        <section className="admin-panel admin-detail-section admin-lead-installer-panel">
          <h2 className="admin-panel-title">Selected installer</h2>
          {installerName ? (
            <div className="admin-lead-installer-card">
              <div className="admin-lead-installer-head">
                <p className="admin-lead-installer-label">
                  {installer?.inferred ? "Recovered from activity" : "Chosen installer"}
                </p>
                <h3 className="admin-lead-installer-name">{installerName}</h3>
                <InstallerChips snap={snap} matchPct={matchPct} />
              </div>
              <dl className="admin-info-list admin-info-list-wide admin-lead-compact-list">
                <Field
                  hideEmpty
                  label="Match"
                  value={
                    matchPct != null && Number.isFinite(matchPct)
                      ? `${Math.round(matchPct)}%`
                      : null
                  }
                />
                <Field hideEmpty label="Match tier" value={snap?.matchTier} />
                <Field hideEmpty label="Coverage" value={snap?.coverage} />
                <Field hideEmpty label="Pricing" value={snap?.pricing} />
                <Field hideEmpty label="Response" value={snap?.response} />
                <Field
                  hideEmpty
                  label="Best suited for"
                  value={snap?.bestSuitedFor}
                />
                <Field hideEmpty label="Strengths" value={snap?.strengths} />
              </dl>
            </div>
          ) : (
            <p className="admin-lead-empty-note">
              No installer was recorded for this submission. Newer introduction
              requests capture the selected installer automatically.
            </p>
          )}
        </section>

        <section className="admin-panel admin-detail-section">
          <h2 className="admin-panel-title">Contact</h2>
          <dl className="admin-info-list admin-info-list-wide admin-lead-compact-list">
            <Field label="Full name" value={record.fullName} />
            <Field label="Email" value={record.email} />
            <Field label="Phone" value={record.phoneNumber} />
            <Field label="Project timeline" value={record.projectTimeline} />
            <Field label="Status" value={projectActionStatusLabel(record.status)} />
          </dl>
        </section>

        {summaryItems.length ? (
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Project summary</h2>
            <div className="admin-lead-summary-grid">
              {summaryItems.map((item, index) => (
                <div
                  key={`${item?.label ?? "item"}-${index}`}
                  className="admin-lead-summary-item"
                >
                  <span className="admin-lead-summary-label">
                    {item?.label || `Item ${index + 1}`}
                  </span>
                  <span className="admin-lead-summary-value">
                    {valueOrDash(item?.value)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="admin-panel admin-detail-section">
          <h2 className="admin-panel-title">Additional notes</h2>
          <div className="admin-lead-notes">
            <p>{valueOrDash(record.additionalNotes)}</p>
          </div>
        </section>

        <section className="admin-panel admin-detail-section">
          <h2 className="admin-panel-title">Links</h2>
          <dl className="admin-info-list admin-info-list-wide admin-lead-compact-list">
            <div className="admin-info-row">
              <dt>Visitor</dt>
              <dd>
                {record.visitorId ? (
                  <Link to={`/admin/users/${record.visitorId}`}>
                    {record.visitorId}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="admin-info-row">
              <dt>Assessment</dt>
              <dd>
                {record.assessmentId && record.visitorId ? (
                  <Link
                    to={`/admin/users/${record.visitorId}/assessments/${record.assessmentId}`}
                  >
                    {record.assessmentRef || record.assessmentId}
                  </Link>
                ) : (
                  valueOrDash(record.assessmentRef)
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
