import type { AssessmentFormData, LoadTableRow } from "../types/assessment";
import { DEFAULT_GRID_TARIFF, EMPTY_ASSESSMENT_FORM } from "../types/assessment";
import { formatUsageFromSpend } from "./assessmentConstants";

const CUSTOM_EXCEL_START = 4;
const CUSTOM_EXCEL_END = 23;
const APPLIANCE_USER_EXCEL_START = 21;
const APPLIANCE_USER_EXCEL_END = 40;

function backfillExcelRows(
  rows: LoadTableRow[],
  start: number,
  end: number,
  needsSlot: (row: LoadTableRow) => boolean,
): LoadTableRow[] {
  const occupied = new Set(
    rows
      .map((r) => r.excelRow)
      .filter(
        (r): r is number => Number.isFinite(r) && r >= start && r <= end,
      ),
  );
  let candidate = start;
  return rows.map((row) => {
    if (!needsSlot(row) || Number.isFinite(row.excelRow)) return row;
    while (candidate <= end && occupied.has(candidate)) candidate += 1;
    if (candidate > end) return row;
    occupied.add(candidate);
    const assigned = candidate;
    candidate += 1;
    return { ...row, excelRow: assigned };
  });
}

function normalizeApplianceRows(rows: LoadTableRow[]): LoadTableRow[] {
  const withSlots = backfillExcelRows(
    rows,
    APPLIANCE_USER_EXCEL_START,
    APPLIANCE_USER_EXCEL_END,
    (row) =>
      row.source === "user" ||
      (Number.isFinite(row.excelRow) &&
        Number(row.excelRow) >= APPLIANCE_USER_EXCEL_START),
  );
  return withSlots.map((row) =>
    row.source === "user" ? { ...row, addedByUser: true } : row,
  );
}

function normalizeCustomRows(rows: LoadTableRow[]): LoadTableRow[] {
  return backfillExcelRows(
    rows,
    CUSTOM_EXCEL_START,
    CUSTOM_EXCEL_END,
    () => true,
  );
}

type AssessmentStateSetters = {
  setSelectedProperty: (label: string) => void;
  setSelectedTemplate: (label: string) => void;
  setSelectedPower: (label: string) => void;
  setInputMethod: (method: "bill" | "appliance" | "custom") => void;
  setSelectedObjective: (label: string) => void;
  setFormData: React.Dispatch<
    React.SetStateAction<{ country: string; state: string }>
  >;
  setFileName: (name: string) => void;
  setBillNotes: (notes: string) => void;
  setMonthlyUsage: (value: string) => void;
  setUsageUnit: (value: string) => void;
  setMonthlySpend: (value: string) => void;
  setGridTariff: (value: string) => void;
  setMonthlyElectricityBill: (value: string) => void;
  setApplianceRows: React.Dispatch<React.SetStateAction<LoadTableRow[]>>;
  setCustomRows: React.Dispatch<React.SetStateAction<LoadTableRow[]>>;
  setRoofArea: (value: string) => void;
  setBackupDuration: (value: string) => void;
};

export function buildAssessmentFormData(input: {
  selectedProperty: string;
  selectedTemplate: string;
  selectedPower: string;
  inputMethod: "bill" | "appliance" | "custom";
  selectedObjective: string;
  formData: { country: string; state: string };
  fileName: string;
  billNotes: string;
  monthlyUsage: string;
  usageUnit: string;
  monthlySpend: string;
  gridTariff: string;
  monthlyElectricityBill: string;
  applianceRows: LoadTableRow[];
  customRows: LoadTableRow[];
  roofArea: string;
  backupDuration: string;
}): AssessmentFormData {
  return {
    propertyType: input.selectedProperty,
    template: input.selectedTemplate,
    country: input.formData.country,
    city: input.formData.state,
    powerSetup: input.selectedPower,
    inputMethod: input.inputMethod,
    mainObjective: input.selectedObjective,
    monthlyElectricityBill: input.monthlyElectricityBill,
    bill: {
      fileName: input.fileName === "No file chosen" ? "" : input.fileName,
      notes: input.billNotes,
      monthlyUsage: input.monthlyUsage,
      usageUnit: input.usageUnit,
      monthlySpend: input.monthlySpend,
      gridTariff: input.gridTariff,
    },
    appliance: { rows: input.applianceRows },
    custom: { rows: input.customRows },
    roofArea: input.roofArea,
    backupDuration: input.backupDuration,
  };
}

export function applyAssessmentFormData(
  data: Partial<AssessmentFormData>,
  setters: AssessmentStateSetters,
) {
  const merged = { ...EMPTY_ASSESSMENT_FORM, ...data };

  if (merged.propertyType) setters.setSelectedProperty(merged.propertyType);
  if (merged.template) setters.setSelectedTemplate(merged.template);
  if (merged.powerSetup) setters.setSelectedPower(merged.powerSetup);
  if (merged.inputMethod) setters.setInputMethod(merged.inputMethod);
  if (merged.mainObjective) setters.setSelectedObjective(merged.mainObjective);

  setters.setFormData({
    country: merged.country || "",
    state: merged.city || "",
  });

  const spend =
    merged.bill?.monthlySpend || merged.monthlyElectricityBill || "";
  const tariff = merged.bill?.gridTariff || DEFAULT_GRID_TARIFF;
  if (spend) {
    setters.setMonthlySpend(spend);
    setters.setMonthlyElectricityBill(spend);
  }

  if (merged.bill) {
    if (merged.bill.fileName) setters.setFileName(merged.bill.fileName);
    setters.setBillNotes(merged.bill.notes || "");
    setters.setUsageUnit(merged.bill.usageUnit || "kWh");
    setters.setGridTariff(tariff);
    setters.setMonthlyUsage(
      merged.bill.monthlyUsage || formatUsageFromSpend(spend, tariff),
    );
  } else if (spend) {
    setters.setGridTariff(tariff);
    setters.setMonthlyUsage(formatUsageFromSpend(spend, tariff));
  }

  if (merged.appliance?.rows?.length) {
    setters.setApplianceRows(normalizeApplianceRows(merged.appliance.rows));
  }

  if (merged.custom?.rows?.length) {
    setters.setCustomRows(normalizeCustomRows(merged.custom.rows));
  }

  if (merged.roofArea) setters.setRoofArea(merged.roofArea);
  if (merged.backupDuration) setters.setBackupDuration(merged.backupDuration);
}
