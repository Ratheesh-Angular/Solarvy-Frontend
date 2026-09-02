/**
 * Solarvy Energy Assessment Report PDF
 *
 * Four-page client template:
 *   Page 1 — Cover: title, solar house illustration, property metadata,
 *            recommendation snapshot cards, executive summary.
 *   Page 2 — Energy profile table, data-quality note, system architecture
 *            diagram, "how the system works" panel.
 *   Page 3 — Recommended system table, financial summary table, financial
 *            interpretation panel.
 *   Page 4 — Energy cost bar chart, energy contribution pie chart, SolarVy
 *            recommendation, next-steps table, disclaimer.
 *
 * All numeric/text content is derived from the existing `AssessmentResults`
 * (Excel-backed) values; only the copy is templated.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
  Line,
  Polygon,
  pdf,
} from "@react-pdf/renderer";
import type { AssessmentResults } from "../types/assessment";

// ---------------------------------------------------------------------------
// Types & formatters
// ---------------------------------------------------------------------------

export type AssessmentReportInputMethod = "bill" | "appliance" | "custom";

export type AssessmentReportPayload = {
  assessmentId: string;
  inputMethod: AssessmentReportInputMethod;
  results: AssessmentResults;
  /** Download date string, e.g. "19 August 2026" */
  assessmentDate: string;
  /** Vite-resolved logo URL (accepted for API compatibility; brand lockup is drawn). */
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
  return `NGN ${Math.round(n).toLocaleString("en-NG", {
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
  if (value === null || value === undefined || value === "") return 0;
  if (value === "-" || value === "—") return 0;
  const n = toNum(value);
  if (n === null) return null;
  return Math.round(n <= 1 ? n * 100 : n);
};

const formatKwh = (value: unknown): string => {
  const n = toNum(value);
  if (n === null) return MISSING;
  return `${n.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} kWh`;
};

const formatKwhPer = (value: number | null, suffix: string): string => {
  if (value === null || !Number.isFinite(value)) return MISSING;
  return `${value.toLocaleString("en-NG", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })} kWh/${suffix}`;
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
  for (const key of ["bill", "appliance", "custom"] as const) {
    const v = results?.summary?.[key]?.estimatedAnnualLoadKwh;
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const colors = {
  navy: "#1b3b6b",
  navyDeep: "#193760",
  orange: "#F5921E",
  panelSolar: "#2f5d9e",
  text: "#3a3f47",
  textDark: "#22303f",
  muted: "#7f8b9a",
  line: "#d8e0e9",
  tableHeaderBg: "#e9eef4",
  white: "#ffffff",
  noteCream: "#fbf3e0",
  noteCreamBorder: "#eddaae",
  panelBlue: "#eaf1f9",
  panelBlueBorder: "#d3e0ef",
  mint: "#eaf3ea",
  mintBorder: "#d4e6d4",
  gridSlice: "#1b60a8",
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
    paddingTop: 30,
    paddingBottom: 46,
    paddingHorizontal: 36,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandBars: {
    width: 16,
    height: 18,
    marginRight: 7,
  },
  brandWord: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },
  headerMeta: {
    textAlign: "right",
  },
  headerMetaLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerMetaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
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

  // Title block
  eyebrow: {
    fontSize: 8,
    color: colors.navy,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    lineHeight: 1.1,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.4,
    marginBottom: 4,
  },

  // Cover illustration
  heroWrap: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  heroCaption: {
    fontSize: 8,
    color: colors.navy,
    textAlign: "center",
    marginTop: 6,
  },

  // Metadata grid
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    marginBottom: 8,
  },
  metaItem: {
    width: "50%",
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 7.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },

  // Section heading
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginTop: 8,
    marginBottom: 12,
  },

  // KPI cards
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    paddingVertical: 11,
    paddingHorizontal: 11,
  },
  kpiLabel: {
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },

  // Dark panel (executive summary / financial interpretation)
  darkPanel: {
    marginTop: 18,
    backgroundColor: colors.navyDeep,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  darkPanelTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  darkPanelText: {
    fontSize: 9,
    color: "#dbe4f0",
    lineHeight: 1.5,
  },

  // Tables
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 2,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.tableHeaderBg,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colLeft: {
    width: "47%",
    paddingRight: 8,
  },
  colRight: {
    width: "53%",
  },
  cellLabel: {
    fontSize: 9,
    color: colors.textDark,
  },
  cellValue: {
    fontSize: 9,
    color: colors.navy,
  },
  cellValuePlain: {
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.35,
  },

  // Notes / callout panels
  noteBox: {
    marginTop: 14,
    backgroundColor: colors.noteCream,
    borderWidth: 1,
    borderColor: colors.noteCreamBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noteText: {
    fontSize: 7.5,
    color: colors.text,
    lineHeight: 1.5,
  },
  noteBold: {
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },
  bluePanel: {
    marginTop: 16,
    backgroundColor: colors.panelBlue,
    borderWidth: 1,
    borderColor: colors.panelBlueBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bluePanelTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  bluePanelText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.55,
  },
  mintPanel: {
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: colors.mint,
    borderWidth: 1,
    borderColor: colors.mintBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  mintPanelText: {
    fontSize: 8.5,
    color: colors.text,
    lineHeight: 1.45,
  },
  disclaimerBox: {
    marginTop: 10,
    backgroundColor: colors.panelBlue,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.5,
  },
  disclaimerBold: {
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
  },

  // Architecture diagram
  archWrap: {
    height: 156,
    position: "relative",
    marginTop: 6,
  },
  archBox: {
    position: "absolute",
    borderWidth: 1,
    borderColor: colors.navy,
    borderRadius: 6,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  archBoxText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    textAlign: "center",
  },

  // Charts
  chartsRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
  },
  chartPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 2,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    height: 140,
  },
  chartTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginBottom: 6,
  },
  chartAxisLabel: {
    fontSize: 6.5,
    color: colors.orange,
    marginBottom: 2,
  },
  barBody: {
    flexDirection: "row",
    flex: 1,
  },
  barYCol: {
    width: 24,
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  barYTick: {
    fontSize: 6,
    color: colors.muted,
    textAlign: "right",
  },
  barPlot: {
    flex: 1,
  },
  barsArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    paddingHorizontal: 8,
  },
  bar: {
    width: "72%",
    backgroundColor: colors.orange,
    minHeight: 1,
  },
  barXLabels: {
    flexDirection: "row",
    marginTop: 4,
    paddingHorizontal: 10,
  },
  barXLabel: {
    flex: 1,
    fontSize: 7,
    color: colors.text,
    textAlign: "center",
  },
  pieWrap: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  pieLabel: {
    position: "absolute",
    fontSize: 6.5,
    color: colors.text,
  },
});

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

function BrandLockup() {
  return (
    <View style={styles.brandRow}>
      <Svg style={styles.brandBars} viewBox="0 0 16 18">
        <Rect x="0" y="4" width="3" height="14" fill={colors.orange} />
        <Rect x="4.5" y="0" width="3" height="18" fill={colors.orange} />
        <Rect x="9" y="6" width="3" height="12" fill={colors.orange} />
        <Rect x="13.5" y="2" width="2.5" height="16" fill={colors.orange} />
      </Svg>
      <Text style={styles.brandWord}>SolarVy</Text>
    </View>
  );
}

function ReportHeader({ assessmentId }: { assessmentId: string }) {
  return (
    <View style={styles.headerRow} fixed>
      <BrandLockup />
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaLabel}>Assessment</Text>
        <Text style={styles.headerMetaValue}>{assessmentId}</Text>
      </View>
    </View>
  );
}

function ReportFooter({
  assessmentId,
  pageLabel,
}: {
  assessmentId: string;
  pageLabel: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {assessmentId} · SolarVy Energy Assessment
      </Text>
      <Text style={styles.footerText}>{pageLabel}</Text>
    </View>
  );
}

type TableColumn = { header: string };

function TwoColTable({
  columns,
  rows,
}: {
  columns: [TableColumn, TableColumn];
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <View style={styles.colLeft}>
          <Text style={styles.tableHeaderText}>{columns[0].header}</Text>
        </View>
        <View style={styles.colRight}>
          <Text style={styles.tableHeaderText}>{columns[1].header}</Text>
        </View>
      </View>
      {rows.map((row) => (
        <View style={styles.tableRow} key={row.label}>
          <View style={styles.colLeft}>
            <Text style={styles.cellLabel}>{row.label}</Text>
          </View>
          <View style={styles.colRight}>
            <Text style={styles.cellValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SolarHouseHero() {
  const cx = 285;
  const cy = 52;
  const rays = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return {
      x1: cx + Math.cos(a) * 26,
      y1: cy + Math.sin(a) * 26,
      x2: cx + Math.cos(a) * 36,
      y2: cy + Math.sin(a) * 36,
    };
  });

  return (
    <View style={styles.heroWrap}>
      <Svg width={340} height={140} viewBox="0 0 340 140">
        {/* House body */}
        <Rect
          x="62"
          y="66"
          width="116"
          height="56"
          fill={colors.white}
          stroke={colors.navy}
          strokeWidth={1.4}
        />
        {/* Roof */}
        <Polygon
          points="40,66 120,26 200,66"
          fill={colors.white}
          stroke={colors.navy}
          strokeWidth={1.4}
        />
        {/* Solar panel band on roof */}
        <Polygon
          points="90,44 150,44 166,58 78,58"
          fill={colors.panelSolar}
          stroke={colors.navy}
          strokeWidth={0.8}
        />
        <Line x1="110" y1="44" x2="102" y2="58" stroke={colors.white} strokeWidth={0.8} />
        <Line x1="130" y1="44" x2="126" y2="58" stroke={colors.white} strokeWidth={0.8} />
        <Line x1="150" y1="44" x2="150" y2="58" stroke={colors.white} strokeWidth={0.8} />
        <Line x1="84" y1="51" x2="160" y2="51" stroke={colors.white} strokeWidth={0.6} />
        {/* Door */}
        <Rect
          x="110"
          y="88"
          width="22"
          height="34"
          fill={colors.white}
          stroke={colors.navy}
          strokeWidth={1.2}
        />
        {/* Windows */}
        <Rect x="74" y="82" width="20" height="20" fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
        <Rect x="148" y="82" width="20" height="20" fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
        {/* Sun */}
        <Circle cx={cx} cy={cy} r={20} fill={colors.orange} />
        {rays.map((r, i) => (
          <Line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke={colors.orange}
            strokeWidth={2.2}
          />
        ))}
      </Svg>
      <Text style={styles.heroCaption}>
        Illustrative residential solar + battery concept
      </Text>
    </View>
  );
}

function SystemArchitectureDiagram() {
  const boxes = {
    solar: { left: 6, top: 58, w: 92, h: 40 },
    inverter: { left: 150, top: 58, w: 118, h: 40 },
    battery: { left: 320, top: 10, w: 96, h: 40 },
    generator: { left: 320, top: 106, w: 96, h: 40 },
    loads: { left: 425, top: 58, w: 92, h: 40 },
  };

  return (
    <View style={styles.archWrap}>
      <Svg
        width="100%"
        height={156}
        viewBox="0 0 523 156"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Solar PV -> Hybrid Inverter */}
        <Line x1={98} y1={78} x2={150} y2={78} stroke={colors.navy} strokeWidth={1.6} />
        {/* Inverter -> bus */}
        <Line x1={268} y1={78} x2={294} y2={78} stroke={colors.navy} strokeWidth={1.6} />
        <Line x1={294} y1={30} x2={294} y2={126} stroke={colors.navy} strokeWidth={1.6} />
        <Line x1={294} y1={30} x2={320} y2={30} stroke={colors.navy} strokeWidth={1.6} />
        <Line x1={294} y1={126} x2={320} y2={126} stroke={colors.navy} strokeWidth={1.6} />
        {/* Battery / Generator converge -> Home Loads */}
        <Line x1={416} y1={30} x2={425} y2={78} stroke={colors.navy} strokeWidth={1.6} />
        <Line x1={416} y1={126} x2={425} y2={78} stroke={colors.navy} strokeWidth={1.6} />
      </Svg>

      <View
        style={[
          styles.archBox,
          { left: boxes.solar.left, top: boxes.solar.top, width: boxes.solar.w, height: boxes.solar.h },
        ]}
      >
        <Text style={styles.archBoxText}>Solar PV</Text>
      </View>
      <View
        style={[
          styles.archBox,
          { left: boxes.inverter.left, top: boxes.inverter.top, width: boxes.inverter.w, height: boxes.inverter.h },
        ]}
      >
        <Text style={styles.archBoxText}>Hybrid Inverter</Text>
      </View>
      <View
        style={[
          styles.archBox,
          { left: boxes.battery.left, top: boxes.battery.top, width: boxes.battery.w, height: boxes.battery.h },
        ]}
      >
        <Text style={styles.archBoxText}>Battery</Text>
      </View>
      <View
        style={[
          styles.archBox,
          { left: boxes.generator.left, top: boxes.generator.top, width: boxes.generator.w, height: boxes.generator.h },
        ]}
      >
        <Text style={styles.archBoxText}>Generator</Text>
      </View>
      <View
        style={[
          styles.archBox,
          { left: boxes.loads.left, top: boxes.loads.top, width: boxes.loads.w, height: boxes.loads.h },
        ]}
      >
        <Text style={styles.archBoxText}>Home Loads</Text>
      </View>
    </View>
  );
}

const niceYMax = (maxValue: number, step = 100): number => {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return step;
  return Math.ceil(maxValue / step) * step;
};

function CostBarChart({
  categories,
  yMax,
}: {
  categories: Array<{ label: string; value: number }>;
  yMax: number;
}) {
  const safeMax = yMax > 0 ? yMax : 1;
  const tickCount = 4;
  const ticks: number[] = [];
  for (let i = tickCount; i >= 0; i -= 1) {
    ticks.push(Math.round((safeMax * i) / tickCount));
  }

  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>Illustrative energy cost comparison</Text>
      <Text style={styles.chartAxisLabel}>NGN/kWh</Text>
      <View style={styles.barBody}>
        <View style={styles.barYCol}>
          {ticks.map((tick, index) => (
            <Text key={`${tick}-${index}`} style={styles.barYTick}>
              {tick}
            </Text>
          ))}
        </View>
        <View style={styles.barPlot}>
          <View style={styles.barsArea}>
            {categories.map((cat) => {
              const ratio = Math.min(1, Math.max(0, cat.value / safeMax));
              return (
                <View key={cat.label} style={styles.barCol}>
                  <View style={[styles.bar, { height: `${Math.max(1, ratio * 100)}%` }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.barXLabels}>
            {categories.map((cat) => (
              <Text key={cat.label} style={styles.barXLabel}>
                {cat.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const wedgePath = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string => {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
};

function ContributionPieChart({
  solarPct,
  gridPct,
}: {
  solarPct: number;
  gridPct: number;
}) {
  const cx = 75;
  const cy = 48;
  const r = 40;
  const gridAngle = (gridPct / 100) * 360;

  // Grid/Other slice starts at top; solar fills the remainder.
  const gridSlice =
    gridPct <= 0
      ? null
      : gridPct >= 100
        ? null
        : wedgePath(cx, cy, r, 0, gridAngle);
  const solarSlice =
    solarPct >= 100
      ? null
      : solarPct <= 0
        ? null
        : wedgePath(cx, cy, r, gridAngle, 360);

  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>Estimated energy contribution</Text>
      <View style={styles.pieWrap}>
        <Svg width={150} height={96} viewBox="0 0 150 96">
          {solarPct >= 100 ? (
            <Circle cx={cx} cy={cy} r={r} fill={colors.orange} />
          ) : null}
          {gridPct >= 100 ? (
            <Circle cx={cx} cy={cy} r={r} fill={colors.gridSlice} />
          ) : null}
          {solarSlice ? <Path d={solarSlice} fill={colors.orange} /> : null}
          {gridSlice ? <Path d={gridSlice} fill={colors.gridSlice} /> : null}
        </Svg>
        <Text style={[styles.pieLabel, { top: 0, right: 22, color: colors.gridSlice }]}>
          Grid/Other {gridPct}%
        </Text>
        <Text style={[styles.pieLabel, { bottom: 4, left: 34, color: colors.orange }]}>
          Solar {solarPct}%
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export function AssessmentReportDocument({
  assessmentId,
  results,
  assessmentDate,
  annualDemandKwh,
}: {
  assessmentId: string;
  results: AssessmentResults;
  assessmentDate: string;
  annualDemandKwh: number | null;
}) {
  const propertyType = formatText(results.propertyType);
  const objective = formatText(results.objective);
  const location =
    [results.city, results.country]
      .map((v) => formatText(v))
      .filter((v) => v !== MISSING)
      .join(", ") || MISSING;

  const pv = `${formatNumber(results.recommendedSolarKwp, 1)} kWp`;
  const battery = `${formatNumber(results.recommendedBatteryKwh, 1)} kWh`;
  const inverter = `${formatNumber(results.recommendedInverterKw, 1)} kW`;
  const annualPvGen = formatKwh(results.annualPvGenerationKwh);
  const usableSolar = formatKwh(results.usableSolarKwh);

  const systemCost = formatNaira(results.estimatedSystemCost);
  const grossSavings = formatNaira(results.grossAnnualSavings);
  const omAllowance = formatNaira(results.annualOmAllowance);
  const netSavings = formatNaira(results.netAnnualSavings);
  const payback = formatPaybackYears(results.simplePaybackYears);

  const annualDemandLabel = formatKwhPer(annualDemandKwh, "year");
  const monthlyDemandLabel = formatKwhPer(
    annualDemandKwh != null ? annualDemandKwh / 12 : null,
    "month",
  );

  const propertyLower =
    propertyType !== MISSING ? propertyType.toLowerCase() : "property";
  const objectiveLower =
    objective !== MISSING ? objective.toLowerCase() : "improve energy reliability";
  const locationPhrase = location !== MISSING ? location : "your location";

  const executiveSummary = `SolarVy assessed this ${propertyLower} in ${locationPhrase} with a primary objective to ${objectiveLower}. The preliminary model recommends a ${pv} solar PV system, ${battery} battery storage and a ${inverter} hybrid inverter. Based on the assessment outputs, the system is estimated to generate ${annualPvGen} of solar energy per year, with net annual savings of approximately ${netSavings} and a simple payback of about ${payback}.`;

  // Cost comparison chart
  const solarCost = toNum(results.solarCostPerKwh) ?? 0;
  const gridCost = toNum(results.gridCostPerKwh) ?? 0;
  const dieselCost = toNum(results.dieselCostPerKwh) ?? 0;
  const costCategories = [
    { label: "Solar", value: solarCost },
    { label: "Grid", value: gridCost },
    { label: "Diesel", value: dieselCost },
  ];
  const costYMax = niceYMax(Math.max(solarCost, gridCost, dieselCost, 1), 100);

  // Energy contribution pie
  const solarSharePct = toPercent(results.solarShare) ?? 0;
  const gridOtherPct = Math.max(0, Math.min(100, 100 - solarSharePct));

  return (
    <Document
      title={`Solarvy Energy Assessment — ${assessmentId}`}
      author="Solarvy"
      subject="Energy Assessment Report"
    >
      {/* -------- Page 1: Cover -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} />

        <Text style={styles.eyebrow}>Solar energy assessment</Text>
        <Text style={styles.title}>Energy Assessment Report</Text>
        <Text style={styles.subtitle}>
          A clear preliminary view of your recommended solar and battery system,
          expected savings and next steps.
        </Text>

        <SolarHouseHero />

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
            <Text style={styles.metaLabel}>Project location</Text>
            <Text style={styles.metaValue}>{location}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recommendation snapshot</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Recommended PV</Text>
            <Text style={styles.kpiValue}>{pv}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Battery</Text>
            <Text style={styles.kpiValue}>{battery}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Annual savings</Text>
            <Text style={styles.kpiValue}>{netSavings}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Payback</Text>
            <Text style={styles.kpiValue}>{payback}</Text>
          </View>
        </View>

        <View style={styles.darkPanel}>
          <Text style={styles.darkPanelTitle}>Executive summary</Text>
          <Text style={styles.darkPanelText}>{executiveSummary}</Text>
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 1 of 4" />
      </Page>

      {/* -------- Page 2: Energy profile & system logic -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} />

        <Text style={styles.eyebrow}>Energy profile</Text>
        <Text style={styles.title}>Your energy profile &amp; system logic</Text>

        <View style={{ marginTop: 8 }}>
          <TwoColTable
            columns={[{ header: "Energy profile" }, { header: "Assessment value" }]}
            rows={[
              { label: "Estimated average monthly energy use", value: monthlyDemandLabel },
              { label: "Estimated annual demand", value: annualDemandLabel },
              { label: "Hybrid inverter rating", value: inverter },
              { label: "Primary objective", value: objective },
              { label: "Assessment location", value: location },
            ]}
          />
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            <Text style={styles.noteBold}>Data quality note: </Text>
            the previous report populated several energy-profile fields
            incorrectly. This improved version uses only consistent assessment
            values and clearly derived figures. Diesel displacement, energy
            independence and CO2 reduction are not shown as quantified results
            because the supplied report does not contain reliable values for them.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Illustrative system architecture
        </Text>
        <SystemArchitectureDiagram />

        <View style={styles.bluePanel}>
          <Text style={styles.bluePanelTitle}>How the system works</Text>
          <Text style={styles.bluePanelText}>
            Solar PV supplies daytime household loads and charges the battery
            when surplus energy is available. The hybrid inverter manages power
            flow between solar, battery and the home. Battery storage supports
            the home during periods when solar generation is low or grid supply
            is unavailable. Generator support, where retained, should be treated
            as an auxiliary backup source rather than the primary daily energy
            source.
          </Text>
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 2 of 4" />
      </Page>

      {/* -------- Page 3: System design & financials -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} />

        <Text style={styles.eyebrow}>System design</Text>
        <Text style={styles.title}>Recommended system &amp; financial analysis</Text>

        <View style={{ marginTop: 8 }}>
          <TwoColTable
            columns={[{ header: "Component" }, { header: "Recommendation" }]}
            rows={[
              { label: "Solar PV capacity", value: pv },
              { label: "Battery storage", value: battery },
              { label: "Hybrid inverter", value: inverter },
              { label: "Annual PV generation", value: annualPvGen },
              { label: "Usable solar energy", value: usableSolar },
            ]}
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Financial summary
        </Text>
        <TwoColTable
          columns={[{ header: "Financial metric" }, { header: "Estimate" }]}
          rows={[
            { label: "Total estimated system cost", value: systemCost },
            { label: "Gross annual savings", value: grossSavings },
            { label: "Annual O&M allowance", value: omAllowance },
            { label: "Net annual savings", value: netSavings },
            { label: "Simple payback", value: payback },
          ]}
        />

        <View style={styles.darkPanel}>
          <Text style={styles.darkPanelTitle}>Financial interpretation</Text>
          <Text style={styles.darkPanelText}>
            The assessment indicates that the largest financial benefit comes
            from replacing more expensive conventional energy with solar
            generation. The simple payback period is an indicative planning
            metric and should be reviewed again once actual installer pricing,
            equipment warranties, operating costs and fuel usage are confirmed.
          </Text>
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 3 of 4" />
      </Page>

      {/* -------- Page 4: Value & next steps -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} />

        <Text style={styles.eyebrow}>Value &amp; next steps</Text>
        <Text style={styles.title}>
          Energy economics and recommended next steps
        </Text>

        <View style={styles.chartsRow}>
          <CostBarChart categories={costCategories} yMax={costYMax} />
          <ContributionPieChart solarPct={solarSharePct} gridPct={gridOtherPct} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>
          SolarVy recommendation
        </Text>
        <View style={styles.mintPanel}>
          <Text style={styles.mintPanelText}>
            A hybrid solar + battery system remains the appropriate preliminary
            direction for this assessment. The recommended battery capacity is
            materially larger than the PV array&apos;s average daily generation,
            so final engineering should verify the household&apos;s outage
            duration, critical loads and desired backup autonomy before
            procurement. This is particularly important because the stated
            objective is to {objectiveLower}.
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colLeft}>
              <Text style={styles.tableHeaderText}>Next step</Text>
            </View>
            <View style={styles.colRight}>
              <Text style={styles.tableHeaderText}>Why it matters</Text>
            </View>
          </View>
          {[
            {
              label: "1. Confirm outage and backup requirement",
              value:
                "Verify typical hours without grid electricity and identify critical household loads.",
            },
            {
              label: "2. Complete technical site review",
              value:
                "Check roof area, orientation, cable routes, distribution board and protection requirements.",
            },
            {
              label: "3. Obtain comparable installer quotations",
              value:
                "Ask installers to quote against the same preliminary SolarVy sizing basis.",
            },
            {
              label: "4. Review financial assumptions",
              value:
                "Confirm actual equipment price, diesel cost, tariff and maintenance assumptions before committing.",
            },
            {
              label: "5. Finalise engineering design",
              value:
                "Installer or qualified engineer confirms final equipment selection and system protection.",
            },
          ].map((row) => (
            <View style={[styles.tableRow, { paddingVertical: 5.5 }]} key={row.label}>
              <View style={styles.colLeft}>
                <Text style={styles.cellLabel}>{row.label}</Text>
              </View>
              <View style={styles.colRight}>
                <Text style={styles.cellValuePlain}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            <Text style={styles.disclaimerBold}>
              Preliminary assessment disclaimer:{" "}
            </Text>
            This report is an indicative planning assessment generated from the
            supplied inputs and simplified assumptions. Final system sizing,
            equipment selection, electrical design, installation cost, energy
            production and financial performance should be validated by
            appropriately qualified professionals before procurement or
            installation.
          </Text>
        </View>

        <ReportFooter assessmentId={assessmentId} pageLabel="Page 4 of 4" />
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
  const annualDemandKwh = resolveEstimatedAnnualDemandKwh(
    payload.results,
    payload.inputMethod,
  );

  const blob = await pdf(
    <AssessmentReportDocument
      assessmentId={payload.assessmentId}
      results={payload.results}
      assessmentDate={payload.assessmentDate}
      annualDemandKwh={annualDemandKwh}
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
