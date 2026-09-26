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
  Circle,
  Image,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { AssessmentResults } from "../types/assessment";
import notoSansRegular from "../assets/fonts/NotoSans-Regular.ttf";
import notoSansBold from "../assets/fonts/NotoSans-Bold.ttf";
import appLogo from "../assets/images/logo-dark.png";
import homePhoto from "../assets/prperty images for photos/home.jpeg";
import hotelPhoto from "../assets/prperty images for photos/hotel.jpeg";
import factoryPhoto from "../assets/prperty images for photos/factoty.jpeg";
import commercialPhoto from "../assets/prperty images for photos/commercial.jpeg";
import hospitalPhoto from "../assets/prperty images for photos/Hospital.jpeg";
import schoolPhoto from "../assets/prperty images for photos/school.jpeg";
import architectureDiagram from "../assets/prperty images for photos/diagram.jpeg";

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
    fontSize: 18,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    lineHeight: 1.2,
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
  heroPhoto: {
    width: 315,
    height: 210,
    objectFit: "cover",
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: colors.line,
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
    marginTop: 8,
    backgroundColor: colors.panelBlue,
    borderWidth: 1,
    borderColor: colors.panelBlueBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  bluePanelTitle: {
    fontSize: 7.5,
    fontFamily: "NotoSans-Bold",
    color: colors.navy,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bluePanelText: {
    fontSize: 9,
    color: colors.text,
    lineHeight: 1.45,
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
  archImageWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  archImage: {
    width: 445,
    height: 250,
    objectFit: "contain",
  },
  // Spacing must live on a View — @react-pdf often ignores margins on bare Text.
  archNoteWrap: {
    marginTop: 5,
    marginBottom: 5,
  },
  archNote: {
    fontSize: 7.5,
    fontFamily: "NotoSans",
    color: colors.text,
    textAlign: "left",
    lineHeight: 1.35,
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
            index === rows.length - 1 ? { borderBottomWidth: 0 } : {},
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

const PROPERTY_HERO_PHOTOS: Record<PropertyHeroType, string> = {
  Home: homePhoto,
  Hotel: hotelPhoto,
  Factory: factoryPhoto,
  Commercial: commercialPhoto,
  Hospital: hospitalPhoto,
  School: schoolPhoto,
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

function PropertySolarHero({ propertyType }: { propertyType: string }) {
  const type = normalizePropertyType(propertyType);
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroImage}>
        <Image src={PROPERTY_HERO_PHOTOS[type]} style={styles.heroPhoto} />
      </View>
      <Text style={styles.heroCaption}>{PROPERTY_HERO_CAPTIONS[type]}</Text>
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

  // Cost comparison chart — prefer PDF Inputs A53:B55 when present
  const energyCostFromExcel = Array.isArray(results.energyCostComparison)
    ? results.energyCostComparison
        .map((row) => ({
          label: String(row?.label ?? "").trim() || MISSING,
          value: toNum(row?.value) ?? 0,
        }))
        .filter((row) => row.label !== MISSING)
    : null;
  const costCategories =
    energyCostFromExcel && energyCostFromExcel.length > 0
      ? energyCostFromExcel
      : [
          { label: "Solar", value: toNum(results.solarCostPerKwh) ?? 0 },
          { label: "Grid", value: toNum(results.gridCostPerKwh) ?? 0 },
          { label: "Diesel", value: toNum(results.dieselCostPerKwh) ?? 0 },
        ];
  const costYMax = niceYMax(
    Math.max(...costCategories.map((c) => c.value), 1),
    100,
  );

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

        <View style={styles.archImageWrap}>
          <Image src={architectureDiagram} style={styles.archImage} />
        </View>
        <View style={styles.archNoteWrap}>
          <Text style={styles.archNote}>
            Conceptual energy-flow illustration. Grid-to-battery indicates
            charging capability, actual charging occurs through appropriate
            inverter/charger circuitry and protection.
          </Text>
        </View>

        <View style={[styles.bluePanel, { marginTop: 6 }]}>
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
                index === all.length - 1 ? { borderBottomWidth: 0 } : {},
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
