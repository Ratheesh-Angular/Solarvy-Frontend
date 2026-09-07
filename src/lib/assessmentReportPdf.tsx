/**
 * Solarvy Energy Assessment Report PDF
 *
 * Multi-page client template (typically four pages; may grow if content overflows):
 *   Page 1 — Cover: title, property-type solar illustration, property metadata,
 *            recommendation snapshot cards, executive summary.
 *   Page 2 — Energy profile table, data-quality note, system architecture
 *            diagram, "how the system works" panel.
 *   Page 3 — Recommended system table, financial summary table, financial
 *            interpretation panel.
 *   Page 4+ — Energy cost bar chart, energy contribution pie chart, SolarVy
 *            recommendation, next-steps table, disclaimer, contact help.
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
  Image,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { AssessmentResults } from "../types/assessment";
import notoSansRegular from "../assets/fonts/NotoSans-Regular.ttf";
import notoSansBold from "../assets/fonts/NotoSans-Bold.ttf";
import appLogo from "../assets/images/logo-dark.png";

// Built-in PDF fonts lack ₦ — register Noto Sans (full TTF) for reliable rendering.
Font.register({
  family: "NotoSans",
  src: notoSansRegular,
});
Font.register({
  family: "NotoSans-Bold",
  src: notoSansBold,
});

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
  /** Vite-resolved logo URL; falls back to the app logo asset. */
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
  return `₦${Math.round(n).toLocaleString("en-NG", {
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
  archGreen: "#2e7d32",
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
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
  brandLogo: {
    width: 120,
    height: 36,
    objectFit: "contain",
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
    fontFamily: "NotoSans-Bold",
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
    fontFamily: "NotoSans-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontFamily: "NotoSans-Bold",
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
    width: "100%",
  },
  heroImage: {
    width: "100%",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 8,
  },
  heroCaption: {
    fontSize: 8,
    color: colors.navy,
    textAlign: "center",
    marginTop: 6,
    width: "100%",
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
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },

  // Section heading
  sectionTitle: {
    fontSize: 15,
    fontFamily: "NotoSans-Bold",
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
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: "NotoSans-Bold",
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
    fontFamily: "NotoSans-Bold",
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
    borderRadius: 0,
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.tableHeaderBg,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeaderText: {
    fontSize: 7,
    fontFamily: "NotoSans-Bold",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  colLeft: {
    width: "47%",
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  colRight: {
    width: "53%",
    paddingLeft: 8,
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
    fontFamily: "NotoSans-Bold",
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
    fontFamily: "NotoSans-Bold",
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
    marginTop: 8,
    backgroundColor: colors.panelBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.5,
  },
  disclaimerBold: {
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },
  helpBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  helpTitle: {
    fontSize: 9,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    marginBottom: 3,
  },
  helpText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  helpContact: {
    fontSize: 8,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
  },

  // Architecture diagram
  archWrap: {
    height: 212,
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
    paddingHorizontal: 4,
  },
  archBoxText: {
    fontSize: 8.5,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    textAlign: "center",
  },
  archEdgeLabel: {
    position: "absolute",
    fontSize: 7,
    color: colors.muted,
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
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    height: 152,
  },
  chartTitle: {
    fontSize: 9.5,
    fontFamily: "NotoSans-Bold",
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

function BrandLockup({ logoSrc }: { logoSrc?: string }) {
  return (
    <Image src={logoSrc || appLogo} style={styles.brandLogo} />
  );
}

function ReportHeader({
  assessmentId,
  logoSrc,
}: {
  assessmentId: string;
  logoSrc?: string;
}) {
  return (
    <View style={styles.headerRow} fixed>
      <BrandLockup logoSrc={logoSrc} />
      <View style={styles.headerMeta}>
        <Text style={styles.headerMetaLabel}>Assessment</Text>
        <Text style={styles.headerMetaValue}>{assessmentId}</Text>
      </View>
    </View>
  );
}

function ReportFooter({ assessmentId }: { assessmentId: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {assessmentId} · SolarVy Energy Assessment
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
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
      {rows.map((row, index) => (
        <View
          style={[
            styles.tableRow,
            index === rows.length - 1 ? { borderBottomWidth: 0 } : null,
          ]}
          key={row.label}
        >
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

type PropertyHeroType =
  | "Home"
  | "Hotel"
  | "Factory"
  | "Commercial"
  | "Hospital"
  | "School";

const PROPERTY_HERO_CAPTIONS: Record<PropertyHeroType, string> = {
  Home: "Illustrative residential solar + battery concept",
  Hotel: "Illustrative hotel solar + battery concept",
  Factory: "Illustrative industrial solar + battery concept",
  Commercial: "Illustrative commercial solar + battery concept",
  Hospital: "Illustrative healthcare solar + battery concept",
  School: "Illustrative school solar + battery concept",
};

function normalizePropertyType(raw: string): PropertyHeroType {
  const key = raw.trim().toLowerCase();
  if (!key || key === "—" || key === "-") return "Home";
  const aliases: Record<string, PropertyHeroType> = {
    home: "Home",
    residential: "Home",
    house: "Home",
    hotel: "Hotel",
    factory: "Factory",
    industrial: "Factory",
    commercial: "Commercial",
    "commercial building": "Commercial",
    office: "Commercial",
    hospital: "Hospital",
    healthcare: "Hospital",
    school: "School",
  };
  return aliases[key] ?? "Home";
}

/** Shared composition for cover property heroes (viewBox 340×140). */
const HERO = {
  groundY: 122,
  strokeOuter: 1.5,
  strokeDetail: 1.2,
  strokePv: 0.7,
  pvH: 12,
} as const;

function HeroSun({ cx = 288, cy = 46 }: { cx?: number; cy?: number }) {
  const rays = Array.from({ length: 8 }).map((_, i) => {
    const a = (i * 45 * Math.PI) / 180;
    return {
      x1: cx + Math.cos(a) * 22,
      y1: cy + Math.sin(a) * 22,
      x2: cx + Math.cos(a) * 30,
      y2: cy + Math.sin(a) * 30,
    };
  });
  return (
    <>
      <Circle cx={cx} cy={cy} r={16} fill={colors.orange} />
      {rays.map((r, i) => (
        <Line
          key={i}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke={colors.orange}
          strokeWidth={1.8}
        />
      ))}
    </>
  );
}

/** Flat rooftop PV — bottom edge sits flush on `roofY`. */
function FlatRoofPv({
  x,
  roofY,
  width,
  height = HERO.pvH,
}: {
  x: number;
  roofY: number;
  width: number;
  height?: number;
}) {
  const y = roofY - height;
  const midY = y + height / 2;
  const cols = 4;
  const colGap = width / cols;
  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors.panelSolar}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      <Line
        x1={x}
        y1={midY}
        x2={x + width}
        y2={midY}
        stroke={colors.white}
        strokeWidth={0.6}
      />
      {[1, 2, 3].map((i) => (
        <Line
          key={i}
          x1={x + colGap * i}
          y1={y}
          x2={x + colGap * i}
          y2={y + height}
          stroke={colors.white}
          strokeWidth={HERO.strokePv}
        />
      ))}
    </>
  );
}

/**
 * Pitched-roof PV as a parallelogram mounted on the roof slope.
 * Bottom edge (x1,y1)→(x2,y2) sits on the roof line; the band rises
 * `drop` along the outward roof-normal (above the roof), matching FlatRoofPv.
 */
function SlantedRoofPv({
  x1,
  y1,
  x2,
  y2,
  drop = 14,
  cols = 3,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  drop?: number;
  cols?: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const uy = dy / len;
  // Perpendicular to slope; prefer the direction that points above the roof
  // (upward in SVG) so the array sits mounted on the roof line.
  let nx = -uy;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const tx1 = x1 + nx * drop;
  const ty1 = y1 + ny * drop;
  const tx2 = x2 + nx * drop;
  const ty2 = y2 + ny * drop;
  const points = `${tx1},${ty1} ${tx2},${ty2} ${x2},${y2} ${x1},${y1}`;
  const midLines = Array.from({ length: cols - 1 }).map((_, i) => {
    const t = (i + 1) / cols;
    return {
      key: i,
      ax: tx1 + (tx2 - tx1) * t,
      ay: ty1 + (ty2 - ty1) * t,
      bx: x1 + (x2 - x1) * t,
      by: y1 + (y2 - y1) * t,
    };
  });
  return (
    <>
      <Polygon
        points={points}
        fill={colors.panelSolar}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      <Line
        x1={tx1 + (x1 - tx1) * 0.5}
        y1={ty1 + (y1 - ty1) * 0.5}
        x2={tx2 + (x2 - tx2) * 0.5}
        y2={ty2 + (y2 - ty2) * 0.5}
        stroke={colors.white}
        strokeWidth={0.6}
      />
      {midLines.map((l) => (
        <Line
          key={l.key}
          x1={l.ax}
          y1={l.ay}
          x2={l.bx}
          y2={l.by}
          stroke={colors.white}
          strokeWidth={HERO.strokePv}
        />
      ))}
    </>
  );
}

function WindowGrid({
  originX,
  originY,
  cols,
  rows,
  size = 12,
  gapX = 8,
  gapY = 8,
}: {
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  size?: number;
  gapX?: number;
  gapY?: number;
}) {
  const cells: { x: number; y: number; key: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: originX + c * (size + gapX),
        y: originY + r * (size + gapY),
        key: `${r}-${c}`,
      });
    }
  }
  return (
    <>
      {cells.map((w) => (
        <Rect
          key={w.key}
          x={w.x}
          y={w.y}
          width={size}
          height={size}
          fill={colors.white}
          stroke={colors.navy}
          strokeWidth={HERO.strokeDetail}
        />
      ))}
    </>
  );
}

/** Small wall-mount battery — bottom sits on shared ground baseline. */
function BatteryUnit({ x, width = 22, height = 28 }: { x: number; width?: number; height?: number }) {
  const y = HERO.groundY - height;
  const termW = 8;
  const termH = 4;
  return (
    <>
      <Rect
        x={x + (width - termW) / 2}
        y={y - termH + 1}
        width={termW}
        height={termH}
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line
        x1={x + 4}
        y1={y + height * 0.35}
        x2={x + width - 4}
        y2={y + height * 0.35}
        stroke={colors.navy}
        strokeWidth={0.8}
      />
      <Line
        x1={x + 4}
        y1={y + height * 0.55}
        x2={x + width - 4}
        y2={y + height * 0.55}
        stroke={colors.navy}
        strokeWidth={0.8}
      />
      <Line
        x1={x + 4}
        y1={y + height * 0.75}
        x2={x + width - 4}
        y2={y + height * 0.75}
        stroke={colors.orange}
        strokeWidth={1.2}
      />
    </>
  );
}

function HomeBuildingArt() {
  const bodyX = 72;
  const bodyW = 108;
  const eaveY = 68;
  const peakX = 126;
  const peakY = 30;
  return (
    <>
      {/* Chimney */}
      <Rect
        x={86}
        y={34}
        width={14}
        height={28}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      {/* Body */}
      <Rect
        x={bodyX}
        y={eaveY}
        width={bodyW}
        height={HERO.groundY - eaveY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* Pitched roof */}
      <Polygon
        points={`${bodyX - 18},${eaveY} ${peakX},${peakY} ${bodyX + bodyW + 18},${eaveY}`}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* PV mounted on right roof face (peak at x=126) */}
      <SlantedRoofPv x1={134} y1={34} x2={178} y2={57} drop={10} cols={3} />
      {/* Windows */}
      <Rect
        x={86}
        y={80}
        width={20}
        height={18}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Rect
        x={146}
        y={80}
        width={20}
        height={18}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      {/* Door */}
      <Rect
        x={116}
        y={92}
        width={20}
        height={30}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Circle cx={132} cy={108} r={1.4} fill={colors.navy} />
      <BatteryUnit x={198} />
    </>
  );
}

function HotelBuildingArt() {
  const roofY = 22;
  const mainX = 78;
  const mainW = 104;
  return (
    <>
      {/* Lower hospitality wing */}
      <Rect
        x={44}
        y={72}
        width={34}
        height={HERO.groundY - 72}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      <WindowGrid originX={50} originY={80} cols={1} rows={2} size={14} gapX={6} gapY={8} />
      {/* Main tower */}
      <Rect
        x={mainX}
        y={roofY}
        width={mainW}
        height={HERO.groundY - roofY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      <FlatRoofPv x={mainX + 8} roofY={roofY} width={mainW - 16} />
      <WindowGrid originX={90} originY={34} cols={4} rows={3} size={13} gapX={9} gapY={9} />
      {/* Canopy flush above door — posts frame entrance to ground */}
      <Rect
        x={108}
        y={96}
        width={44}
        height={6}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line
        x1={112}
        y1={102}
        x2={112}
        y2={HERO.groundY}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line
        x1={148}
        y1={102}
        x2={148}
        y2={HERO.groundY}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      {/* Entrance */}
      <Rect
        x={120}
        y={102}
        width={20}
        height={20}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <BatteryUnit x={198} />
    </>
  );
}

function FactoryBuildingArt() {
  const eaveY = 56;
  const left = 40;
  const right = 200;
  const peakX = 120;
  const peakY = 28;
  return (
    <>
      {/* Main shed */}
      <Rect
        x={left}
        y={eaveY}
        width={right - left}
        height={HERO.groundY - eaveY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* Pitched roof */}
      <Polygon
        points={`${left},${eaveY} ${peakX},${peakY} ${right},${eaveY}`}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* PV mounted on right roof face (peak at x=120) */}
      <SlantedRoofPv x1={128} y1={31} x2={171} y2={46} drop={9} cols={4} />
      {/* Twin bay doors */}
      <Rect
        x={54}
        y={78}
        width={40}
        height={44}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line x1={74} y1={78} x2={74} y2={122} stroke={colors.navy} strokeWidth={1} />
      <Rect
        x={104}
        y={78}
        width={40}
        height={44}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line x1={124} y1={78} x2={124} y2={122} stroke={colors.navy} strokeWidth={1} />
      {/* Side office wing */}
      <Rect
        x={160}
        y={86}
        width={32}
        height={36}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Rect
        x={166}
        y={94}
        width={9}
        height={9}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1}
      />
      <Rect
        x={178}
        y={94}
        width={9}
        height={9}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1}
      />
      <BatteryUnit x={210} />
    </>
  );
}

function CommercialBuildingArt() {
  const roofY = 16;
  const towerX = 98;
  const towerW = 88;
  return (
    <>
      {/* Narrow curtain-wall tower */}
      <Rect
        x={towerX}
        y={roofY}
        width={towerW}
        height={HERO.groundY - roofY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      <FlatRoofPv x={towerX + 6} roofY={roofY} width={towerW - 12} />
      {/* Dense curtain-wall windows — stops above lobby */}
      <WindowGrid originX={108} originY={28} cols={3} rows={4} size={14} gapX={10} gapY={6} />
      {/* Recessed lobby (inset from tower sides) */}
      <Rect
        x={towerX + 18}
        y={106}
        width={towerW - 36}
        height={16}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line
        x1={towerX + towerW / 2}
        y1={106}
        x2={towerX + towerW / 2}
        y2={HERO.groundY}
        stroke={colors.navy}
        strokeWidth={1}
      />
      <BatteryUnit x={72} />
    </>
  );
}

function HospitalBuildingArt() {
  const roofY = 28;
  const wingX = 48;
  const wingW = 152;
  return (
    <>
      {/* Main wing */}
      <Rect
        x={wingX}
        y={roofY}
        width={wingW}
        height={HERO.groundY - roofY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      <FlatRoofPv x={wingX + 10} roofY={roofY} width={wingW - 20} />
      {/* Medical cross badge — clear band below PV, above windows */}
      <Rect
        x={114}
        y={42}
        width={28}
        height={10}
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      <Rect
        x={123}
        y={36}
        width={10}
        height={22}
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      <WindowGrid originX={60} originY={62} cols={5} rows={2} size={12} gapX={12} gapY={8} />
      {/* Ambulance-bay entrance */}
      <Rect
        x={100}
        y={102}
        width={48}
        height={20}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <Line x1={124} y1={102} x2={124} y2={HERO.groundY} stroke={colors.navy} strokeWidth={1} />
      <BatteryUnit x={214} />
    </>
  );
}

function SchoolBuildingArt() {
  const eaveY = 60;
  const left = 52;
  const right = 210;
  const peakX = 131;
  const peakY = 32;
  return (
    <>
      {/* Flagpole on the left — clear of the sun */}
      <Line
        x1={36}
        y1={28}
        x2={36}
        y2={HERO.groundY}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      <Polygon
        points="36,30 58,38 36,46"
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={HERO.strokePv}
      />
      {/* Classroom block */}
      <Rect
        x={left}
        y={eaveY}
        width={right - left}
        height={HERO.groundY - eaveY}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* Low pitched roof */}
      <Polygon
        points={`${left - 8},${eaveY} ${peakX},${peakY} ${right + 8},${eaveY}`}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeOuter}
      />
      {/* PV mounted on right roof face — bottom edge on peak→eave */}
      <SlantedRoofPv x1={141} y1={35} x2={191} y2={51} drop={9} cols={4} />
      <WindowGrid originX={64} originY={72} cols={5} rows={1} size={16} gapX={10} gapY={8} />
      {/* Door */}
      <Rect
        x={120}
        y={96}
        width={22}
        height={26}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={HERO.strokeDetail}
      />
      <BatteryUnit x={224} width={20} height={26} />
    </>
  );
}

function PropertyBuildingArt({ type }: { type: PropertyHeroType }) {
  switch (type) {
    case "Hotel":
      return <HotelBuildingArt />;
    case "Factory":
      return <FactoryBuildingArt />;
    case "Commercial":
      return <CommercialBuildingArt />;
    case "Hospital":
      return <HospitalBuildingArt />;
    case "School":
      return <SchoolBuildingArt />;
    case "Home":
    default:
      return <HomeBuildingArt />;
  }
}

function PropertySolarHero({ propertyType }: { propertyType: string }) {
  const type = normalizePropertyType(propertyType);
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroImage}>
        <Svg width={340} height={140} viewBox="0 0 340 140">
          <PropertyBuildingArt type={type} />
          <HeroSun />
        </Svg>
      </View>
      <Text style={styles.heroCaption}>{PROPERTY_HERO_CAPTIONS[type]}</Text>
    </View>
  );
}

function archArrowHead(
  tipX: number,
  tipY: number,
  direction: "right" | "left" | "up" | "down",
  fill: string,
  size = 5,
) {
  const s = size;
  const half = size * 0.65;
  let points: string;
  if (direction === "right") {
    points = `${tipX},${tipY} ${tipX - s},${tipY - half} ${tipX - s},${tipY + half}`;
  } else if (direction === "left") {
    points = `${tipX},${tipY} ${tipX + s},${tipY - half} ${tipX + s},${tipY + half}`;
  } else if (direction === "down") {
    points = `${tipX},${tipY} ${tipX - half},${tipY - s} ${tipX + half},${tipY - s}`;
  } else {
    points = `${tipX},${tipY} ${tipX - half},${tipY + s} ${tipX + half},${tipY + s}`;
  }
  return <Polygon points={points} fill={fill} />;
}

function SystemArchitectureDiagram() {
  const W = 88;
  const H = 30;
  const col1 = 8;
  const col2 = 132;
  const col3 = 300;
  const col4 = 428;
  const midTop = 94;
  const boxes = {
    solar: { left: col1, top: midTop, w: W, h: H },
    inverter: { left: col2, top: midTop, w: W, h: H },
    ats: { left: col3, top: midTop, w: W, h: H },
    loads: { left: col4, top: midTop, w: W, h: H },
    battery: { left: col2, top: 16, w: W, h: H },
    grid: { left: col3, top: 16, w: W, h: H },
    generator: { left: col3, top: 172, w: W, h: H },
  };

  const midY = boxes.solar.top + H / 2;
  const batteryMidY = boxes.battery.top + H / 2;
  const inverterCx = boxes.inverter.left + boxes.inverter.w / 2;
  const atsCx = boxes.ats.left + boxes.ats.w / 2;
  const batteryRight = boxes.battery.left + boxes.battery.w;
  const gridChargeGap = boxes.grid.left - batteryRight;
  const green = colors.archGreen;
  const navy = colors.navy;
  const tip = 5;

  return (
    <View style={styles.archWrap}>
      <Svg
        width="100%"
        height={212}
        viewBox="0 0 523 212"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Solar PV -> Inverter (green) */}
        <Line
          x1={boxes.solar.left + boxes.solar.w}
          y1={midY}
          x2={boxes.inverter.left - tip}
          y2={midY}
          stroke={green}
          strokeWidth={1.6}
        />
        {archArrowHead(boxes.inverter.left, midY, "right", green)}

        {/* Inverter <-> Battery (green, bi-directional) */}
        <Line
          x1={inverterCx}
          y1={boxes.inverter.top - tip}
          x2={inverterCx}
          y2={boxes.battery.top + boxes.battery.h + tip}
          stroke={green}
          strokeWidth={1.6}
        />
        {archArrowHead(inverterCx, boxes.battery.top + boxes.battery.h, "up", green)}
        {archArrowHead(inverterCx, boxes.inverter.top, "down", green)}

        {/* Inverter -> Changeover (navy) */}
        <Line
          x1={boxes.inverter.left + boxes.inverter.w}
          y1={midY}
          x2={boxes.ats.left - tip}
          y2={midY}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(boxes.ats.left, midY, "right", navy)}

        {/* Grid -> Battery "Grid charging" (navy, straight) */}
        <Line
          x1={boxes.grid.left}
          y1={batteryMidY}
          x2={batteryRight + tip}
          y2={batteryMidY}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(batteryRight, batteryMidY, "left", navy)}

        {/* Grid -> Changeover (navy, down) */}
        <Line
          x1={atsCx}
          y1={boxes.grid.top + boxes.grid.h}
          x2={atsCx}
          y2={boxes.ats.top - tip}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(atsCx, boxes.ats.top, "down", navy)}

        {/* Generator -> Changeover (navy, up) */}
        <Line
          x1={atsCx}
          y1={boxes.generator.top}
          x2={atsCx}
          y2={boxes.ats.top + boxes.ats.h + tip}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(atsCx, boxes.ats.top + boxes.ats.h, "up", navy)}

        {/* Changeover -> Loads (navy) */}
        <Line
          x1={boxes.ats.left + boxes.ats.w}
          y1={midY}
          x2={boxes.loads.left - tip}
          y2={midY}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(boxes.loads.left, midY, "right", navy)}
      </Svg>

      <Text
        style={[
          styles.archEdgeLabel,
          {
            left: batteryRight + 8,
            top: batteryMidY - 14,
            width: gridChargeGap - 16,
          },
        ]}
      >
        Grid charging
      </Text>

      {(
        [
          ["solar", "Solar PV"],
          ["inverter", "Inverter"],
          ["ats", "Changeover"],
          ["loads", "Loads"],
          ["battery", "Battery"],
          ["grid", "Grid"],
          ["generator", "Generator"],
        ] as const
      ).map(([key, label]) => {
        const b = boxes[key];
        return (
          <View
            key={key}
            style={[
              styles.archBox,
              { left: b.left, top: b.top, width: b.w, height: b.h },
            ]}
          >
            <Text style={styles.archBoxText}>{label}</Text>
          </View>
        );
      })}
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

/** Approximate label width at pieLabel fontSize 6.5 (Noto Sans). */
const estimatePieLabelWidth = (text: string): number =>
  Math.ceil(text.length * 3.7);

/**
 * Place a pie slice label outside the arc with quadrant-aware anchoring,
 * then clamp into the plot box so labels never clip or collide with the title.
 */
const placePieLabel = ({
  cx,
  cy,
  r,
  midAngleDeg,
  textWidth,
  plotW,
  plotH,
  labelH = 10,
  inset = 2,
}: {
  cx: number;
  cy: number;
  r: number;
  midAngleDeg: number;
  textWidth: number;
  plotW: number;
  plotH: number;
  labelH?: number;
  inset?: number;
}): { left: number; top: number; width: number; textAlign: "left" | "right" | "center" } => {
  const labelR = r + 13;
  const pos = polar(cx, cy, labelR, midAngleDeg);
  const a = ((midAngleDeg % 360) + 360) % 360;

  let left: number;
  let textAlign: "left" | "right" | "center";
  // Right half: grow outward to the right; left half: to the left; top/bottom: center.
  if (a > 20 && a < 160) {
    left = pos.x + 2;
    textAlign = "left";
  } else if (a > 200 && a < 340) {
    left = pos.x - textWidth - 2;
    textAlign = "right";
  } else {
    left = pos.x - textWidth / 2;
    textAlign = "center";
  }

  let top: number;
  if (a >= 315 || a <= 45) {
    // Near top — keep below the title by staying inside the plot with a floor.
    top = pos.y - labelH;
  } else if (a >= 135 && a <= 225) {
    top = pos.y + 1;
  } else {
    top = pos.y - labelH / 2;
  }

  left = Math.max(inset, Math.min(left, plotW - textWidth - inset));
  top = Math.max(inset, Math.min(top, plotH - labelH - inset));

  return { left, top, width: textWidth, textAlign };
};

function ContributionPieChart({
  solarPct,
  gridPct,
}: {
  solarPct: number;
  gridPct: number;
}) {
  const plotW = 170;
  const plotH = 118;
  const cx = plotW / 2;
  const cy = plotH / 2;
  const r = 38;
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

  const gridMid = gridAngle / 2;
  const solarMid = gridAngle + (360 - gridAngle) / 2;

  const gridLabel = `Grid/Other ${gridPct}%`;
  const solarLabel = `Solar ${solarPct}%`;
  const gridPlacement =
    gridPct > 0
      ? placePieLabel({
          cx,
          cy,
          r,
          midAngleDeg: gridMid,
          textWidth: estimatePieLabelWidth(gridLabel),
          plotW,
          plotH,
        })
      : null;
  const solarPlacement =
    solarPct > 0
      ? placePieLabel({
          cx,
          cy,
          r,
          midAngleDeg: solarMid,
          textWidth: estimatePieLabelWidth(solarLabel),
          plotW,
          plotH,
        })
      : null;

  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>Estimated energy contribution</Text>
      <View style={styles.pieWrap}>
        <View style={{ width: plotW, height: plotH, position: "relative" }}>
          <Svg width={plotW} height={plotH} viewBox={`0 0 ${plotW} ${plotH}`}>
            {solarPct >= 100 ? (
              <Circle cx={cx} cy={cy} r={r} fill={colors.orange} />
            ) : null}
            {gridPct >= 100 ? (
              <Circle cx={cx} cy={cy} r={r} fill={colors.gridSlice} />
            ) : null}
            {solarSlice ? <Path d={solarSlice} fill={colors.orange} /> : null}
            {gridSlice ? <Path d={gridSlice} fill={colors.gridSlice} /> : null}
          </Svg>
          {gridPlacement ? (
            <Text
              style={[
                styles.pieLabel,
                {
                  left: gridPlacement.left,
                  top: gridPlacement.top,
                  width: gridPlacement.width,
                  textAlign: gridPlacement.textAlign,
                  color: colors.gridSlice,
                },
              ]}
            >
              {gridLabel}
            </Text>
          ) : null}
          {solarPlacement ? (
            <Text
              style={[
                styles.pieLabel,
                {
                  left: solarPlacement.left,
                  top: solarPlacement.top,
                  width: solarPlacement.width,
                  textAlign: solarPlacement.textAlign,
                  color: colors.orange,
                },
              ]}
            >
              {solarLabel}
            </Text>
          ) : null}
        </View>
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
  logoSrc,
}: {
  assessmentId: string;
  results: AssessmentResults;
  assessmentDate: string;
  annualDemandKwh: number | null;
  logoSrc?: string;
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

  const primaryRecommendation = formatText(results.primaryRecommendation);
  const aiRecommendation = results.aiRecommendation?.trim() || "";
  const solarVyRecommendation =
    aiRecommendation ||
    (primaryRecommendation !== MISSING
      ? `Based on this assessment, ${primaryRecommendation} is the recommended option. Treat these figures as a planning baseline, then confirm sizing with a site review before you invest.`
      : "Your recommendation will appear here once the assessment results are ready.");

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
        <ReportHeader assessmentId={assessmentId} logoSrc={logoSrc} />

        <Text style={styles.eyebrow}>Solar energy assessment</Text>
        <Text style={styles.title}>Energy Assessment Report</Text>
        <Text style={styles.subtitle}>
          A clear preliminary view of your recommended solar and battery system,
          expected savings and next steps.
        </Text>

        <PropertySolarHero propertyType={propertyType} />

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

        <ReportFooter assessmentId={assessmentId} />
      </Page>

      {/* -------- Page 2: Energy profile & system logic -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} logoSrc={logoSrc} />

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

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
          Illustrative system architecture
        </Text>
        <SystemArchitectureDiagram />

        <View style={[styles.bluePanel, { marginTop: 10 }]}>
          <Text style={styles.bluePanelTitle}>How the system works</Text>
          <Text style={styles.bluePanelText}>
            Solar PV supplies daytime household loads and charges the battery
            when surplus energy is available. The hybrid inverter manages power
            flow between solar, battery and the home, and can also charge the
            battery from the grid when needed. Battery storage supports the home
            during periods when solar generation is low or grid supply is
            unavailable. Generator support, where retained, should be treated as
            an auxiliary backup source rather than the primary daily energy
            source.
          </Text>
        </View>

        <ReportFooter assessmentId={assessmentId} />
      </Page>

      {/* -------- Page 3: System design & financials -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} logoSrc={logoSrc} />

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

        <ReportFooter assessmentId={assessmentId} />
      </Page>

      {/* -------- Page 4: Value & next steps -------- */}
      <Page size="A4" style={styles.page}>
        <ReportHeader assessmentId={assessmentId} logoSrc={logoSrc} />

        <Text style={styles.eyebrow}>Value &amp; next steps</Text>
        <Text style={styles.title}>
          Energy economics and recommended next steps
        </Text>

        <View style={styles.chartsRow} wrap={false}>
          <CostBarChart categories={costCategories} yMax={costYMax} />
          <ContributionPieChart solarPct={solarSharePct} gridPct={gridOtherPct} />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
          SolarVy recommendation
        </Text>
        <View style={styles.mintPanel} wrap={false}>
          <Text style={styles.mintPanelText}>{solarVyRecommendation}</Text>
        </View>

        <View style={styles.table} wrap={false}>
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
          ].map((row, index, all) => (
            <View
              style={[
                styles.tableRow,
                { paddingVertical: 5 },
                index === all.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
              key={row.label}
            >
              <View style={styles.colLeft}>
                <Text style={styles.cellLabel}>{row.label}</Text>
              </View>
              <View style={styles.colRight}>
                <Text style={styles.cellValuePlain}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View wrap={false}>
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

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>
              Need help with your energy recommendation?
            </Text>
            <Text style={styles.helpText}>
              Our team is available to help you understand your results and
              explore the next steps.
            </Text>
            <Text style={styles.helpContact}>
              info@solarvy.ng | www.solarvy.ng
            </Text>
          </View>
        </View>

        <ReportFooter assessmentId={assessmentId} />
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
