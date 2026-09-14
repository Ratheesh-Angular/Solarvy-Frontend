import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminGetAssessment } from "../lib/adminApi";
import type { AssessmentFormData, LoadTableRow } from "../types/assessment";

function valueOrDash(value: unknown) {
  if (value == null || String(value).trim() === "") return "—";
  return String(value);
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="admin-info-row">
      <dt>{label}</dt>
      <dd>{valueOrDash(value)}</dd>
    </div>
  );
}

function LoadRowsTable({ rows }: { rows: LoadTableRow[] }) {
  const visible = (rows || []).filter((r) => !r.removed);
  if (visible.length === 0) {
    return <p className="admin-empty-text">No equipment rows.</p>;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Equipment</th>
            <th>Qty</th>
            <th>Hours</th>
            <th>Power (W)</th>
            <th>Load factor %</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id || `${row.kind}-${row.excelRow}`}>
              <td>{valueOrDash(row.kind)}</td>
              <td>{valueOrDash(row.qty)}</td>
              <td>{valueOrDash(row.hours)}</td>
              <td>{valueOrDash(row.power)}</td>
              <td>{valueOrDash(row.loadFactorPct)}</td>
              <td>{valueOrDash(row.source)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminAssessmentDetail() {
  const { id = "", assessmentId = "" } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<AssessmentFormData | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [displayId, setDisplayId] = useState(assessmentId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminGetAssessment(assessmentId, { visitorId: id });
        if (cancelled) return;
        setFormData((data.formData as AssessmentFormData) || null);
        setCreatedAt(data.createdAt ? String(data.createdAt) : null);
        setDisplayId(String(data.id || assessmentId));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load assessment",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, assessmentId]);

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading assessment…</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">
          {error || "Assessment not found"}
        </div>
        <Link
          to={`/admin/users/${id}`}
          className="admin-btn admin-btn-secondary"
        >
          Back to user
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page-inner admin-assessment-detail">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <p className="admin-eyebrow">Assessment inputs</p>
          <h1 className="admin-page-title">{displayId}</h1>
          <p className="admin-page-subtitle">
            {createdAt
              ? `Submitted ${new Date(createdAt).toLocaleString()}`
              : "Submitted form values from start assessment"}
          </p>
        </div>
        <Link
          to={`/admin/users/${id}`}
          className="admin-btn admin-btn-secondary"
        >
          Back to user
        </Link>
      </div>

      <div className="admin-detail-sections">
        <section className="admin-panel admin-detail-section">
          <h2 className="admin-panel-title">Building &amp; location</h2>
          <dl className="admin-info-list admin-info-list-wide">
            <Field label="Property type" value={formData.propertyType} />
            <Field label="Template" value={formData.template} />
            <Field label="Country" value={formData.country} />
            <Field label="State / city" value={formData.city} />
          </dl>
        </section>

        <section className="admin-panel admin-detail-section">
          <h2 className="admin-panel-title">Power &amp; goals</h2>
          <dl className="admin-info-list admin-info-list-wide">
            <Field label="Power setup" value={formData.powerSetup} />
            <Field label="Main objective" value={formData.mainObjective} />
            <Field label="Input method" value={formData.inputMethod} />
            <Field label="Roof area" value={formData.roofArea} />
            <Field label="Backup duration" value={formData.backupDuration} />
            <Field
              label="Monthly electricity bill"
              value={formData.monthlyElectricityBill}
            />
          </dl>
        </section>

        {formData.inputMethod === "bill" ? (
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Bill inputs</h2>
            <dl className="admin-info-list admin-info-list-wide">
              <Field label="File name" value={formData.bill?.fileName} />
              <Field label="Notes" value={formData.bill?.notes} />
              <Field label="Monthly usage" value={formData.bill?.monthlyUsage} />
              <Field label="Usage unit" value={formData.bill?.usageUnit} />
              <Field label="Monthly spend" value={formData.bill?.monthlySpend} />
              <Field label="Grid tariff" value={formData.bill?.gridTariff} />
            </dl>
          </section>
        ) : null}

        {formData.inputMethod === "appliance" ? (
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Appliance load table</h2>
            <LoadRowsTable rows={formData.appliance?.rows || []} />
          </section>
        ) : null}

        {formData.inputMethod === "custom" ? (
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Custom load table</h2>
            <LoadRowsTable rows={formData.custom?.rows || []} />
          </section>
        ) : null}
      </div>

      <div className="admin-assessment-detail-spacer" aria-hidden />
<div className="d-flex justify-content-end">
<button
        type="button"
        className="admin-btn admin-btn-primary "
        onClick={() =>
          navigate(`/admin/users/${id}/assessments/${assessmentId}/results`)
        }
      >
        Check results
      </button>
</div>
      
    </div>
  );
}
