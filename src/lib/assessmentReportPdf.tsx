/**
 * Solarvy Energy Assessment Report PDF
 *
 * Four-page client template:
 *   Page 1 — Cover: title, property-type solar illustration, property metadata,
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
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { AssessmentResults } from "../types/assessment";
import notoSansRegular from "../assets/fonts/NotoSans-Regular.ttf";
import notoSansBold from "../assets/fonts/NotoSans-Bold.ttf";

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
    fontFamily: "NotoSans-Bold",
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
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    height: 140,
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

function HeroSun({ cx = 285, cy = 52 }: { cx?: number; cy?: number }) {
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
    <>
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
    </>
  );
}

function FlatRoofPv({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const midY = y + height / 2;
  const colGap = width / 4;
  return (
    <>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors.panelSolar}
        stroke={colors.navy}
        strokeWidth={0.8}
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
          strokeWidth={0.7}
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
          strokeWidth={1}
        />
      ))}
    </>
  );
}

function HomeBuildingArt() {
  return (
    <>
      <Rect
        x="62"
        y="66"
        width="116"
        height="56"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <Polygon
        points="40,66 120,26 200,66"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
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
      <Rect
        x="110"
        y="88"
        width="22"
        height="34"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
      <Rect x="74" y="82" width="20" height="20" fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
      <Rect x="148" y="82" width="20" height="20" fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
    </>
  );
}

function HotelBuildingArt() {
  return (
    <>
      <Rect
        x="48"
        y="28"
        width="148"
        height="94"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <FlatRoofPv x={58} y={18} width={128} height={14} />
      <WindowGrid originX={60} originY={40} cols={5} rows={3} size={14} gapX={10} gapY={10} />
      {/* Canopy */}
      <Rect
        x="96"
        y="98"
        width={52}
        height={6}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
      <Line x1="100" y1="104" x2="100" y2="122" stroke={colors.navy} strokeWidth={1.2} />
      <Line x1="144" y1="104" x2="144" y2="122" stroke={colors.navy} strokeWidth={1.2} />
      {/* Entrance */}
      <Rect
        x="112"
        y="104"
        width={20}
        height={18}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
    </>
  );
}

function FactoryBuildingArt() {
  return (
    <>
      {/* Main shed */}
      <Rect
        x="36"
        y="54"
        width="176"
        height={68}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      {/* Sloped roof silhouette */}
      <Polygon
        points="36,54 124,28 212,54"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <FlatRoofPv x={70} y={34} width={108} height={16} />
      {/* Bay doors */}
      <Rect x="52" y="78" width={40} height={44} fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
      <Line x1="72" y1="78" x2="72" y2="122" stroke={colors.navy} strokeWidth={1} />
      <Rect x="108" y="78" width={40} height={44} fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
      <Line x1="128" y1="78" x2="128" y2="122" stroke={colors.navy} strokeWidth={1} />
      {/* Side office wing */}
      <Rect x="164" y="86" width={36} height={36} fill={colors.white} stroke={colors.navy} strokeWidth={1.2} />
      <Rect x="172" y="94" width={10} height={10} fill={colors.white} stroke={colors.navy} strokeWidth={1} />
      <Rect x="186" y="94" width={10} height={10} fill={colors.white} stroke={colors.navy} strokeWidth={1} />
    </>
  );
}

function CommercialBuildingArt() {
  return (
    <>
      <Rect
        x="58"
        y="22"
        width="128"
        height="100"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <FlatRoofPv x={68} y={12} width={108} height={14} />
      {/* Curtain-wall style windows */}
      <WindowGrid originX={70} originY={36} cols={4} rows={4} size={16} gapX={10} gapY={8} />
      {/* Ground lobby */}
      <Rect
        x="102"
        y="100"
        width={40}
        height={22}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
      <Line x1="122" y1="100" x2="122" y2="122" stroke={colors.navy} strokeWidth={1} />
    </>
  );
}

function HospitalBuildingArt() {
  return (
    <>
      {/* Main wing */}
      <Rect
        x="44"
        y="36"
        width="160"
        height="86"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <FlatRoofPv x={56} y={24} width={136} height={14} />
      <WindowGrid originX={56} originY={48} cols={5} rows={2} size={14} gapX={10} gapY={12} />
      {/* Cross emblem */}
      <Rect
        x="110"
        y="88"
        width={28}
        height={10}
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={0.8}
      />
      <Rect
        x="119"
        y="79"
        width={10}
        height={28}
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={0.8}
      />
      {/* Entrance */}
      <Rect
        x="104"
        y="106"
        width={40}
        height={16}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
    </>
  );
}

function SchoolBuildingArt() {
  return (
    <>
      {/* Classroom block */}
      <Rect
        x="34"
        y="58"
        width="178"
        height="64"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      {/* Low pitched roof */}
      <Polygon
        points="28,58 123,30 218,58"
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.4}
      />
      <FlatRoofPv x={68} y={38} width={110} height={14} />
      <WindowGrid originX={48} originY={70} cols={6} rows={1} size={16} gapX={8} gapY={8} />
      {/* Door */}
      <Rect
        x="108"
        y="96"
        width={22}
        height={26}
        fill={colors.white}
        stroke={colors.navy}
        strokeWidth={1.2}
      />
      {/* Flagpole */}
      <Line x1="224" y1="28" x2="224" y2="122" stroke={colors.navy} strokeWidth={1.4} />
      <Polygon
        points="224,30 248,38 224,46"
        fill={colors.orange}
        stroke={colors.navy}
        strokeWidth={0.8}
      />
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
  const H = 36;
  const boxes = {
    solar: { left: 4, top: 88, w: 88, h: H },
    inverter: { left: 128, top: 88, w: 118, h: H },
    ats: { left: 298, top: 88, w: 118, h: H },
    loads: { left: 448, top: 88, w: 72, h: H },
    battery: { left: 128, top: 8, w: 118, h: H },
    grid: { left: 298, top: 8, w: 118, h: H },
    generator: { left: 298, top: 168, w: 118, h: H },
  };

  const midY = boxes.solar.top + H / 2;
  const batteryMidY = boxes.battery.top + H / 2;
  const inverterCx = boxes.inverter.left + boxes.inverter.w / 2;
  const atsCx = boxes.ats.left + boxes.ats.w / 2;
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
        {/* Solar PV -> Inverter / Charger (green) */}
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

        {/* Inverter -> ATS (navy) */}
        <Line
          x1={boxes.inverter.left + boxes.inverter.w}
          y1={midY}
          x2={boxes.ats.left - tip}
          y2={midY}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(boxes.ats.left, midY, "right", navy)}

        {/* Grid -> Battery "Grid charging" (navy, left) */}
        <Line
          x1={boxes.grid.left}
          y1={batteryMidY}
          x2={boxes.battery.left + boxes.battery.w + tip}
          y2={batteryMidY}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(boxes.battery.left + boxes.battery.w, batteryMidY, "left", navy)}

        {/* Grid -> ATS (navy, down) */}
        <Line
          x1={atsCx}
          y1={boxes.grid.top + boxes.grid.h}
          x2={atsCx}
          y2={boxes.ats.top - tip}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(atsCx, boxes.ats.top, "down", navy)}

        {/* Generator -> ATS (navy, up) */}
        <Line
          x1={atsCx}
          y1={boxes.generator.top}
          x2={atsCx}
          y2={boxes.ats.top + boxes.ats.h + tip}
          stroke={navy}
          strokeWidth={1.6}
        />
        {archArrowHead(atsCx, boxes.ats.top + boxes.ats.h, "up", navy)}

        {/* ATS -> Loads (navy) */}
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
            left: boxes.battery.left + boxes.battery.w + 4,
            top: batteryMidY - 14,
            width: boxes.grid.left - (boxes.battery.left + boxes.battery.w) - 8,
          },
        ]}
      >
        Grid charging
      </Text>

      {(
        [
          ["solar", "Solar PV"],
          ["inverter", "Inverter / Charger"],
          ["ats", "ATS / Changeover"],
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
  const labelR = r + 8;
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
  const gridLabelPos = polar(cx, cy, labelR, gridMid);
  const solarLabelPos = polar(cx, cy, labelR, solarMid);
  // Approximate label box so text sits near the slice edge.
  const labelOffset = { w: 52, h: 10 };

  return (
    <View style={styles.chartPanel}>
      <Text style={styles.chartTitle}>Estimated energy contribution</Text>
      <View style={styles.pieWrap}>
        <View style={{ width: 150, height: 96, position: "relative" }}>
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
          {gridPct > 0 ? (
            <Text
              style={[
                styles.pieLabel,
                {
                  left: Math.max(0, gridLabelPos.x - labelOffset.w / 2),
                  top: Math.max(0, gridLabelPos.y - labelOffset.h / 2),
                  color: colors.gridSlice,
                },
              ]}
            >
              Grid/Other {gridPct}%
            </Text>
          ) : null}
          {solarPct > 0 ? (
            <Text
              style={[
                styles.pieLabel,
                {
                  left: Math.max(0, solarLabelPos.x - labelOffset.w / 2),
                  top: Math.max(0, solarLabelPos.y - labelOffset.h / 2),
                  color: colors.orange,
                },
              ]}
            >
              Solar {solarPct}%
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
        <ReportHeader assessmentId={assessmentId} />

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

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
          Illustrative system architecture
        </Text>
        <SystemArchitectureDiagram />

        <View style={[styles.bluePanel, { marginTop: 10 }]}>
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
          <Text style={styles.mintPanelText}>{solarVyRecommendation}</Text>
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
          ].map((row, index, all) => (
            <View
              style={[
                styles.tableRow,
                { paddingVertical: 5.5 },
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
