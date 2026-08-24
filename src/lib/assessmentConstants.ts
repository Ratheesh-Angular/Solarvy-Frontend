import type { AssessmentFormData, QuickAssessmentFormData } from "../types/assessment";
import { DEFAULT_GRID_TARIFF } from "../types/assessment";

export { DEFAULT_GRID_TARIFF };

/** Parse UI number strings that may include grouping commas. */
export function parseFormattedNumber(value: string): number {
  if (!value) return NaN;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return n;
}

/** Keep digits only and group with commas: 234521 → 234,521. */
export function formatIntegerWithCommas(value: string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

const COMPACT_METRIC_THRESHOLD = 1_000_000;

function groupIntDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Comma-group an integer, using raw digits when the value is beyond MAX_SAFE_INTEGER. */
export function formatGroupedInteger(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      return Math.round(value).toLocaleString("en-US");
    }
    const sign = value < 0 ? "-" : "";
    const digits = Math.abs(value).toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 0,
    });
    return `${sign}${groupIntDigits(digits.replace(/\D/g, "") || "0")}`;
  }

  const raw = String(value).trim();
  if (!raw) return "";
  const sign = raw.startsWith("-") ? "-" : "";
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${sign}${groupIntDigits(digits.replace(/^0+(?=\d)/, "") || "0")}`;
}

function formatGroupedNumber(value: number, fractionDigits?: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return formatGroupedInteger(value);
  }
  if (fractionDigits == null) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Short compact notation: 250000000 → 250M, 1500000 → 1.5M. */
export function formatCompactShort(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Live-summary display vs hover title.
 * Compact (₦250M / 250M) only when |value| >= 1,000,000; otherwise full commas (₦250,000).
 */
export function formatMetricDisplay(
  value: number,
  kind: "number" | "currency",
  fractionDigits?: number,
): { display: string; full: string } {
  const safe = Number.isFinite(value) ? value : 0;
  const full =
    kind === "currency"
      ? `₦${formatGroupedInteger(safe)}`
      : formatGroupedNumber(safe, fractionDigits);
  const compact = formatCompactShort(safe);
  const display =
    Math.abs(safe) >= COMPACT_METRIC_THRESHOLD
      ? kind === "currency"
        ? `₦${compact}`
        : compact
      : full;
  return { display, full };
}

/** Monthly usage kWh from spend ÷ tariff, rounded to 2 decimals. */
export function formatUsageFromSpend(
  spend: string,
  tariff: string = DEFAULT_GRID_TARIFF,
): string {
  const spendNum = parseFormattedNumber(spend);
  const tariffNum = parseFormattedNumber(tariff);
  if (
    !Number.isFinite(spendNum) ||
    spendNum <= 0 ||
    !Number.isFinite(tariffNum) ||
    tariffNum <= 0
  ) {
    return "";
  }
  return String(Math.round((spendNum / tariffNum) * 100) / 100);
}

/** Home quick-form property value -> Excel property label (User_Inputs!B10). */
export const PROPERTY_TYPE_TO_LABEL: Record<string, string> = {
  home: "Home",
  hotel: "Hotel",
  factory: "Factory",
  "commercial building": "Commercial",
  commercial: "Commercial",
  hospital: "Hospital",
  school: "School",
};

/** Home power setup value -> Excel label (User_Inputs!B13). */
export const POWER_SETUP_TO_LABEL: Record<string, string> = {
  "Grid Generator": "Grid + Generator",
  "Grid + Generator": "Grid + Generator",
  "Grid Only": "Grid Only",
  "Solar grid": "Solar + Grid",
  "Solar + Grid": "Solar + Grid",
  "Generator Only": "Generator Only",
  "No Reliable Grid": "No Reliable Grid",
};

/** Home main objective value -> Excel label (User_Inputs!B14). */
export const MAIN_OBJECTIVE_TO_LABEL: Record<string, string> = {
  "1": "Reduce Diesel Use",
  "2": "Reduce Electricity Bills",
  "3": "Backup During Outages",
  "Reduce Diesel Use": "Reduce Diesel Use",
  "Reduce Electricity Bills": "Reduce Electricity Bills",
  "Backup During Outages": "Backup During Outages",
};

export function quickFormToAssessmentForm(
  quick: QuickAssessmentFormData,
): Partial<AssessmentFormData> {
  const partial: Partial<AssessmentFormData> = {
    inputMethod: "bill",
  };

  if (quick.propertyType) {
    const label = PROPERTY_TYPE_TO_LABEL[quick.propertyType.toLowerCase()];
    if (label) partial.propertyType = label;
  }

  if (quick.location) {
    partial.country = quick.location;
  }

  if (quick.monthlyElectricityBill) {
    const spend = formatIntegerWithCommas(quick.monthlyElectricityBill);
    partial.monthlyElectricityBill = spend;
    partial.bill = {
      fileName: "",
      notes: "",
      monthlyUsage: formatUsageFromSpend(spend, DEFAULT_GRID_TARIFF),
      usageUnit: "kWh",
      monthlySpend: spend,
      gridTariff: DEFAULT_GRID_TARIFF,
    };
  }

  if (quick.powerSetup) {
    const label = POWER_SETUP_TO_LABEL[quick.powerSetup];
    if (label) partial.powerSetup = label;
  }

  if (quick.mainObjective) {
    const label = MAIN_OBJECTIVE_TO_LABEL[quick.mainObjective];
    if (label) partial.mainObjective = label;
  }

  return partial;
}
