/**
 * Solarvy Energy Assessment Report PDF
 *
 * PLACEHOLDER FIELDS (no Excel cell yet — update these constants when cells exist):
 *
 * | Field                         | Constant / location                                      | PDF page / section        |
 * |-------------------------------|----------------------------------------------------------|---------------------------|
 * | NPV                           | PLACEHOLDER_NPV (line ~below)                            | Page 3 — Financials table |
 * | IRR                           | PLACEHOLDER_IRR                                          | Page 3 — Financials table |
 * | Diesel Displacement Value     | PLACEHOLDER_DIESEL_DISPLACEMENT_VALUE                    | Page 3 — Impact table     |
 * | Energy Independence Ratio     | PLACEHOLDER_ENERGY_INDEPENDENCE_RATIO                    | Page 3 — Impact table     |
 * | Estimated CO2 reduction       | PLACEHOLDER_CO2_REDUCTION                                | Page 3 — Impact table     |
 * | Energy Profile (5 rows)       | ENERGY_PROFILE_ROWS                                      | Page 2 — Energy Profile   |
 *
 * When Excel cells are ready: extend Backend OUTPUT_CELLS + AssessmentResults,
 * then replace these placeholders with real formatted values in buildReportPayload /
 * the Document props.
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { AssessmentResults } from "../types/assessment";

// ---------------------------------------------------------------------------
// Placeholders — replace when Excel cells are added
// ---------------------------------------------------------------------------

/** NPV — no Outputs cell yet. Add cell ref here later. */
export const PLACEHOLDER_NPV = "—";

/** IRR — no Outputs cell yet. Add cell ref here later. */
export const PLACEHOLDER_IRR = "—";

/** Diesel Displacement Value — no Outputs cell yet. Add cell ref here later. */
export const PLACEHOLDER_DIESEL_DISPLACEMENT_VALUE = "—";

/** Energy Independence Ratio — no Outputs cell yet. Add cell ref here later. */
export const PLACEHOLDER_ENERGY_INDEPENDENCE_RATIO = "—";

/** Estimated CO2 reduction — no Outputs cell yet. Add cell ref here later. */
export const PLACEHOLDER_CO2_REDUCTION = "—";

/**
 * Energy Profile table rows — values hardcoded to 0 until Excel cells exist.
 * Update each `value` (and optionally `label` / `unit`) when cells are mapped.
 */
export const ENERGY_PROFILE_ROWS: Array<{
  label: string;
  value: string;
  unit: string;
  /** Set this when an Outputs cell is assigned, e.g. "B50" */
  excelCell?: string;
}> = [
  { label: "Peak demand", value: "0", unit: "kW" },
  { label: "Average daily load", value: "0", unit: "kWh/day" },
  { label: "Critical load share", value: "0", unit: "%" },
  { label: "Night-time / backup load", value: "0", unit: "kWh/day" },
  { label: "Grid dependence", value: "0", unit: "%" },
];

// ---------------------------------------------------------------------------
// Types & formatters
// ---------------------------------------------------------------------------

export type AssessmentReportInputMethod = "bill" | "appliance" | "custom";

export type AssessmentReportPayload = {
  assessmentId: string;
  inputMethod: AssessmentReportInputMethod;
  results: AssessmentResults;
  /** Download date string, e.g. "6 August 2026" */
  assessmentDate: string;
  /** Vite-resolved logo URL */
  logoSrc?: string;
};

const MISSING = "—";

const toNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const formatNaira = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  // Helvetica lacks the ₦ glyph — use ASCII "NGN" for reliable PDF rendering.
  return `NGN ${Math.round(n).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
};

const formatPaybackYears = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  if (Math.abs(n - Math.round(n)) < 1e-6) return `${Math.round(n)} years`;
  return `${(Math.round(n * 10) / 10).toLocaleString("en-IN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} years`;
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
  const n = toNum(value);
  if (n === null) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const formatPercentLabel = (value: unknown): string => {
  const pct = toPercent(value);
  return pct === null ? MISSING : `${pct}%`;
};

const formatKwh = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  return `${n.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} kWh`;
};

const formatDieselLitres = (value: unknown): string => {
  const n = toNum(value) ?? 0;
  return `${n.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} L`;
};

export function formatAssessmentDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function resolveEstimatedAnnualDemandKwh(
  results: AssessmentResults | null | undefined,
  inputMethod: AssessmentReportInputMethod,
): number | null {
  const fromMethod = results?.summary?.[inputMethod]?.estimatedAnnualLoadKwh;
  if (fromMethod != null && Number.isFinite(Number(fromMethod))) {
    return Number(fromMethod);
  }
  // Fallback: first non-null summary annual load
  for (const key of ["bill", "appliance", "custom"] as const) {
    const v = results?.summary?.[key]?.estimatedAnnualLoadKwh;
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Styles — charcoal + brand blue (Assessment Result theme)
// ---------------------------------------------------------------------------

const colors = {
  charcoal: "#1A1F2E",
  charcoalMuted: "#3D4558",
  brand: "#174c90",
  brandSoft: "#bfd0ea",
  brandBg: "#eef4ff",
  paper: "#FFFFFF",
  pageBg: "#FFFFFF",
  line: "#e8edf5",
  muted: "#6B7280",
  value: "#111827",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.value,
    backgroundColor: colors.pageBg,
    paddingTop: 40,
    paddingBottom: 52,
    paddingHorizontal: 40,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  logo: {
    width: 110,
    height: 36,
    objectFit: "contain",
  },
  brandFallback: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    letterSpacing: 0.5,
  },
  headerMeta: {
    textAlign: "right",
  },
  headerMetaLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerMetaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },
  titleBlock: {
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 9,
    color: colors.brand,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    color: colors.charcoalMuted,
    lineHeight: 1.4,
    maxWidth: 420,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  metaItem: {
    width: "48%",
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metaLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.charcoal,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  kpiCardBrand: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  kpiLabel: {
    fontSize: 7,
    color: "#D1D5DB",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  kpiLabelOnBrand: {
    fontSize: 7,
    color: colors.paper,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.paper,
  },
  kpiValueOnBrand: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.paper,
  },
  section: {
    marginTop: 18,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    marginBottom: 4,
  },
  sectionRule: {
    height: 2,
    width: 36,
    backgroundColor: colors.brand,
    marginBottom: 12,
  },
  sectionIntro: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  table: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.brandBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.brandSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRowLast: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colLabel: {
    flex: 1.4,
    fontSize: 10,
    color: colors.charcoalMuted,
  },
  colValue: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.value,
    textAlign: "right",
  },
  demandBanner: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  demandLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  demandValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  disclaimer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  disclaimerTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: colors.muted,
    lineHeight: 1.45,
  },
  ctaBox: {
    marginTop: 14,
    backgroundColor: colors.charcoal,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  ctaTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.paper,
    marginBottom: 4,
  },
  ctaText: {
    fontSize: 9,
    color: "#D1D5DB",
    lineHeight: 1.4,
  },
  ctaAccent: {
    marginTop: 8,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.brandSoft,
  },
  archSection: {
    marginTop: 16,
  },
  archTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.brand,
    marginBottom: 14,
  },
  archDiagram: {
    height: 132,
    flexDirection: "row",
    alignItems: "center",
  },
  archBox: {
    backgroundColor: colors.brandBg,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  archBoxText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.brand,
    textAlign: "center",
  },
  archLineH: {
    height: 2,
    flex: 1,
    backgroundColor: colors.brand,
    minWidth: 12,
  },
  archCenterCol: {
    width: 88,
    height: 132,
    alignItems: "center",
    justifyContent: "space-between",
  },
  archLineV: {
    width: 2,
    flexGrow: 1,
    backgroundColor: colors.brand,
  },
  chartsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  chartPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 8,
  },
  chartTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.charcoal,
    textAlign: "center",
    marginBottom: 6,
  },
  chartBody: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  chartYCol: {
    width: 36,
    marginRight: 2,
    paddingBottom: 16,
  },
  chartYLabel: {
    fontSize: 5.5,
    color: colors.muted,
    textAlign: "right",
    marginBottom: 4,
    lineHeight: 1.2,
  },
  chartYTicks: {
    height: 88,
    justifyContent: "space-between",
  },
  chartYTick: {
    fontSize: 6,
    color: colors.muted,
    textAlign: "right",
  },
  chartPlot: {
    flex: 1,
  },
  chartBarsArea: {
    height: 88,
    flexDirection: "row",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.charcoal,
    paddingHorizontal: 4,
  },
  chartBarCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    paddingHorizontal: 3,
  },
  chartBar: {
    width: "70%",
    backgroundColor: colors.brand,
    minHeight: 1,
  },
  chartXLabels: {
    flexDirection: "row",
    marginTop: 4,
    paddingHorizontal: 4,
  },
  chartXLabel: {
    flex: 1,
    fontSize: 7,
    color: colors.charcoal,
    textAlign: "center",
  },
});

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function ReportFooter({
  assessmentId,
  pageLabel,
}: {
  assessmentId: string;
  pageLabel: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{assessmentId} · solarvy.ng</Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  );
}

function SectionHeading({ title, intro }: { title: string; intro?: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
      {intro ? <Text style={styles.sectionIntro}>{intro}</Text> : null}
    </View>
  );
}

function TableRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={last ? styles.tableRowLast : styles.tableRow}>
      <Text style={styles.colLabel}>{label}</Text>
      <Text style={styles.colValue}>{value}</Text>
    </View>
  );
}

function SystemArchitectureDiagram() {
  return (
    <View style={styles.archSection} wrap={false}>
      <Text style={styles.archTitle}>Illustrative system architecture</Text>
      <View style={styles.archDiagram}>
        <View style={styles.archBox}>
          <Text style={styles.archBoxText}>Solar PV</Text>
        </View>
        <View style={styles.archLineH} />
        <View style={styles.archBox}>
          <Text style={styles.archBoxText}>Hybrid Inverter</Text>
        </View>
        <View style={styles.archLineH} />
        <View style={styles.archCenterCol}>
          <View style={styles.archBox}>
            <Text style={styles.archBoxText}>Battery</Text>
          </View>
          <View style={styles.archLineV} />
          <View style={styles.archBox}>
            <Text style={styles.archBoxText}>Generator</Text>
          </View>
        </View>
        <View style={styles.archLineH} />
        <View style={styles.archBox}>
          <Text style={styles.archBoxText}>Loads</Text>
        </View>
      </View>
    </View>
  );
}

const niceYMax = (maxValue: number, step = 100): number => {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return step;
  return Math.ceil(maxValue / step) * step;
};

const PLOT_HEIGHT = 88;

function MiniBarChart({
  title,
  yLabel,
  categories,
  yMax,
  tickCount = 4,
}: {
  title: string;
  yLabel: string;
  categories: Array<{ label: string; value: number }>;
  yMax: number;
  tickCount?: number;
}) {
  const safeMax = yMax > 0 ? yMax : 1;
  const ticks: number[] = [];
  for (let i = tickCount; i >= 0; i -= 1) {
    ticks.push(Math.round((safeMax * i) / tickCount));
  }

  return (
    <View style={styles.chartPanel} wrap={false}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartBody}>
        <View style={styles.chartYCol}>
          <Text style={styles.chartYLabel}>{yLabel}</Text>
          <View style={styles.chartYTicks}>
            {ticks.map((tick, index) => (
              <Text key={`${tick}-${index}`} style={styles.chartYTick}>
                {tick}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.chartPlot}>
          <View style={styles.chartBarsArea}>
            {categories.map((cat) => {
              const ratio = Math.min(1, Math.max(0, cat.value / safeMax));
              const barHeight = Math.max(1, Math.round(ratio * PLOT_HEIGHT));
              return (
                <View key={cat.label} style={styles.chartBarCol}>
                  <View style={[styles.chartBar, { height: barHeight }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.chartXLabels}>
            {categories.map((cat) => (
              <Text key={cat.label} style={styles.chartXLabel}>
                {cat.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ReportHeader({
  logoSrc,
  assessmentId,
}: {
  logoSrc?: string;
  assessmentId: string;
}) {
  return (
    <View style={styles.headerRow}>
      {logoSrc ? (
        <Image src={logoSrc} style={styles.logo} />
      ) : (
        <Text style={styles.brandFallback}>Solarvy</Text>
      )}
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaLabel}>Assessment</Text>
        <Text style={styles.headerMetaValue}>{assessmentId}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

function AssessmentReportDocument({
  assessmentId,
  results,
  assessmentDate,
  estimatedAnnualDemand,
  logoSrc,
}: {
  assessmentId: string;
  results: AssessmentResults;
  assessmentDate: string;
  estimatedAnnualDemand: string;
  logoSrc?: string;
}) {
  const propertyType = formatText(results.propertyType);
  const objective = formatText(results.objective);
  const projectLocation =
    [results.city, results.country]
      .map((v) => formatText(v))
      .filter((v) => v !== MISSING)
      .join(", ") || MISSING;
  const solarKwp = `${formatNumber(results.recommendedSolarKwp, 1)} kWp`;
  const batteryKwh = `${formatNumber(results.recommendedBatteryKwh, 1)} kWh`;
  const inverterKw = `${formatNumber(results.recommendedInverterKw, 1)} kW`;
  const annualSavings = formatNaira(results.netAnnualSavings);
  const payback = formatPaybackYears(results.simplePaybackYears);
  const disclaimer =
    results.disclaimer ||
    "These results are indicative only. Final system design, procurement, and performance should be validated through a detailed review before investment or installation.";

  const solarCost = toNum(results.solarCostPerKwh) ?? 0;
  const gridCost = toNum(results.gridCostPerKwh) ?? 0;
  const dieselCost = toNum(results.dieselCostPerKwh) ?? 0;
  const costCategories = [
    { label: "Solar", value: solarCost },
    { label: "Grid", value: gridCost },
    { label: "Diesel", value: dieselCost },
  ];
  const costYMax = niceYMax(Math.max(solarCost, gridCost, dieselCost, 1), 100);

  const solarSharePct = toPercent(results.solarShare) ?? 0;
  const gridOtherPct = Math.max(0, 100 - solarSharePct);
  const contributionCategories = [
    { label: "Solar", value: solarSharePct },
    { label: "Grid/Other", value: gridOtherPct },
  ];

  return (
    <Document
      title={`Solarvy Energy Assessment — ${assessmentId}`}
      author="Solarvy"
      subject="Energy Assessment Report"
    >
      {/* -------- Page 1: Cover / snapshot -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader logoSrc={logoSrc} assessmentId={assessmentId} />

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Solar energy assessment</Text>
          <Text style={styles.title}>Energy Assessment Report</Text>
          <Text style={styles.subtitle}>
            **Add house illustration with solar panels**
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Property type</Text>
            <Text style={styles.metaValue}>{propertyType}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Assessment date</Text>
            <Text style={styles.metaValue}>{assessmentDate}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Primary objective</Text>
            <Text style={styles.metaValue}>{objective}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Project Location</Text>
            <Text style={styles.metaValue}>{projectLocation}</Text>
          </View>
        </View>

        <SectionHeading
          title="Recommendation snapshot"
          intro="Key sizing and savings figures from your assessment Outputs."
        />

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Recommended PV</Text>
            <Text style={styles.kpiValue}>{solarKwp}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Battery</Text>
            <Text style={styles.kpiValue}>{batteryKwh}</Text>
          </View>
          <View style={styles.kpiCardBrand}>
            <Text style={styles.kpiLabelOnBrand}>Annual savings</Text>
            <Text style={styles.kpiValueOnBrand}>{annualSavings}</Text>
          </View>
          <View style={styles.kpiCardBrand}>
            <Text style={styles.kpiLabelOnBrand}>Payback</Text>
            <Text style={styles.kpiValueOnBrand}>{payback}</Text>
          </View>
        </View>

        {/* <View style={{ marginTop: 20 }}>
          <View style={styles.demandBanner}>
            <Text style={styles.demandLabel}>Estimated annual demand</Text>
            <Text style={styles.demandValue}>{estimatedAnnualDemand}</Text>
          </View>
        </View> */}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Executive Summary</Text>
          <Text
            style={[
              styles.disclaimerText,
              { fontSize: 10, fontFamily: "Helvetica" },
            ]}
          >
            The Solarvy platform evaluated the site as a hotel in Lagos, Nigeria
            with a primary objective to reduce diesel use and improve
            reliability. Based on the sample inputs, the site appears well
            suited to a hybrid solar plus battery solution because generator
            dependence is meaningful, outage exposure is material, and the
            estimated operating profile suggests strong value in shifting
            daytime demand away from diesel.
          </Text>
          <Text
            style={[
              styles.disclaimerText,
              { marginTop: 10, fontSize: 10, fontFamily: "Helvetica" },
            ]}
          >
            The model indicates an example configuration of 28 kWp solar PV, 40
            kWh battery storage, and a 25 kW hybrid inverter. At this level, the
            strongest financial value driver is the reduction of diesel-backed
            electricity, with indicative annual savings of NGN 7,800,000 and a
            simple payback of approximately 4.2 years.
          </Text>
        </View>

        <View style={[styles.table, { marginTop: 10 }]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>
              Key Finding
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Example Result
            </Text>
          </View>
          <TableRow
            label="Estimated annual demand"
            value={estimatedAnnualDemand}
          />
          <TableRow label="Recommended PV" value={solarKwp} />
          <TableRow label="Recommended Battery" value={batteryKwh} />
          <TableRow
            label="Estimated Diesel Reduction"
            value={formatKwh(results.dieselReduction)}
          />
          <TableRow
            label="Estimated Annual Savings"
            value={formatNaira(results.netAnnualSavings)}
          />
          <TableRow
            label="Estimated Simple Payback"
            value={formatPaybackYears(results.simplePaybackYears)}
            last
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Important Notes</Text>
          <Text
            style={[
              styles.disclaimerText,
              { fontSize: 10, fontFamily: "Helvetica" },
            ]}
          >
            This report is preliminary. Final design, equipment selection, and
            performance should be validated through a more detailed engineering
            review before procurement or installation.
          </Text>
        </View>

        <SectionHeading title="Energy Profile" />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>Metric</Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Example Value
            </Text>
          </View>
          <TableRow label="Average Monthly Energy Use" value={"0"} />
          <TableRow label="Estimated Annual Demand" value={"0"} />

          <TableRow label="Estimated peak demand" value={"0"} />
          <TableRow
            label="Typical outage exposure"
            value={formatNaira(results.netAnnualSavings)}
          />
          <TableRow label="Primary energy objective" value={"0"} last />
        </View>

        <View style={styles.disclaimer}>
          <Text
            style={[
              styles.disclaimerText,
              { fontSize: 10, fontFamily: "Helvetica" },
            ]}
          >
            The example load profile suggests a site with meaningful daily
            demand and recurring outage exposure. This kind of operating
            environment typically supports a hybrid system case because solar
            generation can offset daytime energy use, while battery storage can
            reduce generator runtime and support critical loads during
            interruptions.
          </Text>
        </View>

        <SystemArchitectureDiagram />

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 1 of 3" />
      </Page>

      {/* -------- Page 2: System recommendation -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader logoSrc={logoSrc} assessmentId={assessmentId} />

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>System design</Text>
          <Text style={styles.title}>
            Recommended system and financial analysis
          </Text>
          {/* <Text style={styles.subtitle}>
            Proposed solar PV capacity, storage, and expected generation for
            your property.
          </Text> */}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>
              Component
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Recommendation
            </Text>
          </View>
          <TableRow label="Solar PV capacity" value={solarKwp} />
          <TableRow label="Battery storage" value={batteryKwh} />
          <TableRow label="Hybrid inverter" value={inverterKw} />
          <TableRow
            label="Annual PV generation"
            value={formatKwh(results.annualPvGenerationKwh)}
          />
          <TableRow
            label="Usable solar energy"
            value={formatKwh(results.usableSolarKwh)}
            last
          />
        </View>

        <SectionHeading title="Metrics" intro="" />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>Metric</Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Example Result
            </Text>
          </View>
          <View style={styles.table}>
            <TableRow
              label="Total estimated system cost"
              value={formatNaira(results.estimatedSystemCost)}
            />
            <TableRow
              label="Gross annual savings"
              value={formatNaira(results.grossAnnualSavings)}
            />
            <TableRow
              label="Annual O&M allowance"
              value={formatNaira(results.annualOmAllowance)}
            />
            <TableRow
              label="Net annual savings"
              value={formatNaira(results.netAnnualSavings)}
            />
            <TableRow
              label="Simple payback"
              value={formatPaybackYears(results.simplePaybackYears)}
            />
            {/* PLACEHOLDER_NPV — Page 3 Financial summary */}
            <TableRow label="NPV" value={PLACEHOLDER_NPV} />
            {/* PLACEHOLDER_IRR — Page 3 Financial summary */}
            <TableRow label="IRR" value={PLACEHOLDER_IRR} last />
          </View>
          {/* {ENERGY_PROFILE_ROWS.map((row, index) => (
            <TableRow
              key={row.label}
              label={row.label}
              value={`${row.value} ${row.unit}`}
              last={index === ENERGY_PROFILE_ROWS.length - 1}
            />
          ))} */}
        </View>

        <SectionHeading title="Hybrid Performance and Value Analysis" />
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>
              Performance Metric
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Example Result
            </Text>
          </View>
          <TableRow
            label="Diesel Saved"
            value={formatKwh(results.dieselReduction)}
          />
          <TableRow
            label="Diesel Displacement Value"
            value={formatNaira(results.dieselReduction)}
          />
          <TableRow label="Energy Independence Ratio" value={"0"} />
          <TableRow label="Estimated CO₂ Reduction" value={"0"} />
        </View>

        <View style={styles.chartsRow} wrap={false}>
          <MiniBarChart
            title="Energy cost comparison"
            yLabel="NGN/kWh"
            categories={costCategories}
            yMax={costYMax}
            tickCount={3}
          />
          <MiniBarChart
            title="Estimated energy contribution"
            yLabel="% of annual demand"
            categories={contributionCategories}
            yMax={100}
            tickCount={5}
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>
            Recomendation Narrative and Steps
          </Text>
          <Text
            style={[
              styles.disclaimerText,
              { fontSize: 10, fontFamily: "Helvetica" },
            ]}
          >
            Recomendation Insight <br />A hybrid solar plus battery system is
            recommended because generator dependence appears significant and the
            example model indicates strong fuel-saving potential. Battery
            storage is included primarily to reduce generator runtime and
            support continuity of supply during outages. The recommended system
            should be treated as a preliminary assessment rather than a final
            design package.
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.4 }]}>
              Recommended Next Steps
            </Text>
            <Text
              style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}
            >
              Why it matters
            </Text>
          </View>
          <TableRow
            label="Request detailed technical review"
            value="Validate load assumptions, battery sizing, and real operating profile before procurement."
          />
          <TableRow
            label="Obtain installer quotations"
            value="Compare implementation options against the preliminary system recommendation."
          />
          <TableRow
            label="Review commercial assumptions"
            value="Check tariff, diesel price, and operating profile against actual site data."
          />
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 2 of 3" />
      </Page>

      {/* -------- Page 3: Financials & impact -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader logoSrc={logoSrc} assessmentId={assessmentId} />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>CTA</Text>
          <Text style={styles.disclaimerText}>
            Request a detailed review from SAEK Energy or Get matched with
            supplier and installer option
          </Text>
        </View>

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Disclaimer</Text>
          <Text style={styles.ctaText}>
            This report is an indicative assessment generated from example
            inputs and simplified assumptions. Final design, procurement,
            performance, and financial outcomes may vary.
          </Text>
          <Text style={styles.ctaAccent}>
            www.solarvy.ng · support@solarvy.ng
          </Text>
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 3 of 3" />
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export async function downloadAssessmentReport(
  payload: AssessmentReportPayload,
): Promise<void> {
  const annualDemandRaw = resolveEstimatedAnnualDemandKwh(
    payload.results,
    payload.inputMethod,
  );
  const estimatedAnnualDemand =
    annualDemandRaw == null
      ? MISSING
      : `${annualDemandRaw.toLocaleString("en-NG", {
          maximumFractionDigits: 1,
          minimumFractionDigits: 0,
        })} kWh/year`;

  const blob = await pdf(
    <AssessmentReportDocument
      assessmentId={payload.assessmentId}
      results={payload.results}
      assessmentDate={payload.assessmentDate}
      estimatedAnnualDemand={estimatedAnnualDemand}
      logoSrc={payload.logoSrc}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Solarvy-Energy-Assessment-${payload.assessmentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
