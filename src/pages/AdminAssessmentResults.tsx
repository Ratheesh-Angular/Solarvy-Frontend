import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminGetAssessment } from "../lib/adminApi";
import {
  downloadAssessmentReport,
  formatAssessmentDate,
  type AssessmentReportInputMethod,
} from "../lib/assessmentReportPdf";
import type {
  AssessmentFormData,
  AssessmentResults,
} from "../types/assessment";

const MISSING = "N/A";

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const formatNaira = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  return `₦${Math.round(n).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

const formatPaybackYears = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
};

const formatNumber = (value: unknown, maxFractionDigits = 10): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  if (maxFractionDigits === 1) return n.toFixed(1);
  return n.toLocaleString("en-NG", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
};

const formatText = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return MISSING;
  return String(value);
};

const toPercent = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return 0;
  if (value === "-" || value === "—") return 0;
  const n = toNum(value);
  if (n === null) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const formatPercentLabel = (value: unknown): string => {
  const pct = toPercent(value);
  return pct === null ? MISSING : `${pct}%`;
};

const isDash = (value: unknown): boolean => {
  if (value === null || value === undefined || value === "") return true;
  const s = String(value).trim();
  return s === "—" || s === "-" || s === "–";
};

const formatStrategyPayback = (value: unknown): string => {
  if (isDash(value) || toNum(value) === null) return "—";
  return `${formatPaybackYears(value)} yrs`;
};

type StrategyRow = NonNullable<AssessmentResults["strategyComparison"]>[number];

const STRATEGY_FALLBACK: StrategyRow[] = [
  { strategy: "Grid Only" },
  { strategy: "Grid + Generator" },
  { strategy: "Solar + Grid" },
  { strategy: "Solar + Battery + Generator" },
];

export default function AdminAssessmentResults() {
  const { id = "", assessmentId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AssessmentResults | null>(null);
  const [formData, setFormData] = useState<AssessmentFormData | null>(null);
  const [displayId, setDisplayId] = useState(assessmentId);
  const [inputMethod, setInputMethod] =
    useState<AssessmentReportInputMethod>("bill");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await adminGetAssessment(assessmentId, { visitorId: id });
        if (cancelled) return;
        setResults((data.results as AssessmentResults) || null);
        const form = (data.formData as AssessmentFormData) || null;
        setFormData(form);
        setDisplayId(String(data.id || assessmentId));
        const method = form?.inputMethod;
        if (method === "bill" || method === "appliance" || method === "custom") {
          setInputMethod(method);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load results",
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

  const handleDownload = async () => {
    if (!results || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadAssessmentReport({
        assessmentId: displayId,
        inputMethod,
        results: {
          ...results,
          city: results.city ?? formData?.city,
          country: results.country ?? formData?.country,
        },
        assessmentDate: formatAssessmentDate(),
      });
    } catch {
      setError("Unable to generate the PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-empty-text">Loading results…</p>
      </div>
    );
  }

  if (error && !results) {
    return (
      <div className="admin-page-inner">
        <div className="admin-panel admin-alert">{error}</div>
        <Link
          to={`/admin/users/${id}/assessments/${assessmentId}`}
          className="admin-btn admin-btn-secondary"
        >
          Back to assessment
        </Link>
      </div>
    );
  }

  const strategyRows =
    results?.strategyComparison && results.strategyComparison.length > 0
      ? results.strategyComparison
      : STRATEGY_FALLBACK;

  const recommendation =
    results?.aiRecommendation ||
    (results?.primaryRecommendation
      ? `Based on this assessment, ${results.primaryRecommendation} is the recommended option.`
      : null);

  const disclaimer =
    results?.disclaimer ||
    "These results are indicative only. Final system design, procurement, and performance should be validated through a detailed review before investment or installation.";

  return (
    <div className="admin-page-inner admin-assessment-results">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <p className="admin-eyebrow">Assessment results</p>
          <h1 className="admin-page-title">{displayId}</h1>
          <p className="admin-page-subtitle">
            Same result details shown to the visitor, with PDF download.
          </p>
        </div>
        <div className="admin-header-actions">
          <Link
            to={`/admin/users/${id}/assessments/${assessmentId}`}
            className="admin-btn admin-btn-secondary"
          >
            Back to inputs
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!results || isDownloading}
            onClick={() => void handleDownload()}
          >
            {isDownloading ? "Preparing PDF…" : "Download report"}
          </button>
        </div>
      </div>

      {error ? <div className="admin-panel admin-alert">{error}</div> : null}

      {!results ? (
        <div className="admin-panel">
          <p className="admin-empty-text">No results stored for this assessment.</p>
        </div>
      ) : (
        <div className="admin-detail-sections">
          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Recommended sizing</h2>
            <div className="admin-result-kpi-grid">
              <div className="admin-result-kpi">
                <span className="admin-result-kpi-label">Solar</span>
                <strong>{formatNumber(results.recommendedSolarKwp, 1)} kWp</strong>
              </div>
              <div className="admin-result-kpi">
                <span className="admin-result-kpi-label">Battery</span>
                <strong>
                  {formatNumber(results.recommendedBatteryKwh, 1)} kWh
                </strong>
              </div>
              <div className="admin-result-kpi">
                <span className="admin-result-kpi-label">Inverter</span>
                <strong>
                  {formatNumber(results.recommendedInverterKw, 1)} kW
                </strong>
              </div>
            </div>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Financial summary</h2>
            <dl className="admin-info-list admin-info-list-wide">
              <div className="admin-info-row">
                <dt>Estimated system cost</dt>
                <dd>{formatNaira(results.estimatedSystemCost)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Gross annual savings</dt>
                <dd>{formatNaira(results.grossAnnualSavings)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Annual O&amp;M allowance</dt>
                <dd>{formatNaira(results.annualOmAllowance)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Net annual savings</dt>
                <dd>{formatNaira(results.netAnnualSavings)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Simple payback</dt>
                <dd>{formatPaybackYears(results.simplePaybackYears)} years</dd>
              </div>
            </dl>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Energy mix</h2>
            <dl className="admin-info-list admin-info-list-wide">
              <div className="admin-info-row">
                <dt>Solar share</dt>
                <dd>{formatPercentLabel(results.solarShare)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Grid offset</dt>
                <dd>{formatPercentLabel(results.gridOffset)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Diesel reduction</dt>
                <dd>{formatPercentLabel(results.dieselReduction)}</dd>
              </div>
              <div className="admin-info-row">
                <dt>Diesel saved</dt>
                <dd>
                  {(toNum(results.dieselSavedLitres) ?? 0).toLocaleString(
                    "en-NG",
                    {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    },
                  )}
                  L
                </dd>
              </div>
              <div className="admin-info-row">
                <dt>System class</dt>
                <dd>{formatText(results.systemClass)}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Compare power options</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Annual cost</th>
                    <th>Reliability</th>
                    <th>Diesel use</th>
                    <th>Payback</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {strategyRows.map((row, idx) => (
                    <tr key={`${row.strategy}-${idx}`}>
                      <td>{formatText(row.strategy)}</td>
                      <td>
                        {isDash(row.annualCost)
                          ? "—"
                          : formatNaira(row.annualCost)}
                      </td>
                      <td>{formatText(row.reliability)}</td>
                      <td>{formatText(row.dieselUse)}</td>
                      <td>{formatStrategyPayback(row.payback)}</td>
                      <td>
                        {String(row.recommended ?? "")
                          .trim()
                          .toLowerCase() === "recommended"
                          ? "Recommended"
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">AI recommendation</h2>
            <p className="admin-result-copy">
              {recommendation || "No recommendation text stored."}
            </p>
          </section>

          <section className="admin-panel admin-detail-section">
            <h2 className="admin-panel-title">Disclaimer</h2>
            <p className="admin-result-copy admin-muted">{disclaimer}</p>
          </section>
        </div>
      )}
    </div>
  );
}
