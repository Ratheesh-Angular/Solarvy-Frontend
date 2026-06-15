import type { AssessmentFormData, LoadTableRow } from "../types/assessment";
import { EMPTY_ASSESSMENT_FORM } from "../types/assessment";

type AssessmentStateSetters = {
  setSelectedProperty: (id: number) => void;
  setSelectedPower: (id: number) => void;
  setInputMethod: (method: "bill" | "appliance" | "custom") => void;
  setSelectedObjectiveId: (id: string) => void;
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
  setAppliancePresetTabId: (id: string) => void;
  setApplianceRows: React.Dispatch<React.SetStateAction<LoadTableRow[]>>;
  setCustomPresetTabId: (id: string) => void;
  setCustomRows: React.Dispatch<React.SetStateAction<LoadTableRow[]>>;
  setRoofArea: (value: string) => void;
  setBackupDuration: (value: string) => void;
};

export function buildAssessmentFormData(input: {
  selectedProperty: number;
  selectedPower: number;
  inputMethod: "bill" | "appliance" | "custom";
  selectedObjectiveId: string;
  formData: { country: string; state: string };
  fileName: string;
  billNotes: string;
  monthlyUsage: string;
  usageUnit: string;
  monthlySpend: string;
  gridTariff: string;
  monthlyElectricityBill: string;
  appliancePresetTabId: string;
  applianceRows: LoadTableRow[];
  customPresetTabId: string;
  customRows: LoadTableRow[];
  roofArea: string;
  backupDuration: string;
}): AssessmentFormData {
  return {
    propertyTypeId: input.selectedProperty,
    country: input.formData.country,
    city: input.formData.state,
    powerSetupId: input.selectedPower,
    inputMethod: input.inputMethod,
    mainObjectiveId: input.selectedObjectiveId,
    monthlyElectricityBill: input.monthlyElectricityBill,
    bill: {
      fileName: input.fileName === "No file chosen" ? "" : input.fileName,
      notes: input.billNotes,
      monthlyUsage: input.monthlyUsage,
      usageUnit: input.usageUnit,
      monthlySpend: input.monthlySpend,
      gridTariff: input.gridTariff,
    },
    appliance: {
      presetTabId: input.appliancePresetTabId,
      rows: input.applianceRows,
    },
    custom: {
      presetTabId: input.customPresetTabId,
      rows: input.customRows,
    },
    roofArea: input.roofArea,
    backupDuration: input.backupDuration,
  };
}

export function applyAssessmentFormData(
  data: Partial<AssessmentFormData>,
  setters: AssessmentStateSetters,
) {
  const merged = { ...EMPTY_ASSESSMENT_FORM, ...data };

  if (merged.propertyTypeId) setters.setSelectedProperty(merged.propertyTypeId);
  if (merged.powerSetupId) setters.setSelectedPower(merged.powerSetupId);
  if (merged.inputMethod) setters.setInputMethod(merged.inputMethod);
  if (merged.mainObjectiveId) setters.setSelectedObjectiveId(merged.mainObjectiveId);

  setters.setFormData({
    country: merged.country || "",
    state: merged.city || "",
  });

  if (merged.monthlyElectricityBill) {
    setters.setMonthlyElectricityBill(merged.monthlyElectricityBill);
  }

  if (merged.bill) {
    if (merged.bill.fileName) setters.setFileName(merged.bill.fileName);
    setters.setBillNotes(merged.bill.notes || "");
    setters.setMonthlyUsage(merged.bill.monthlyUsage || "");
    setters.setUsageUnit(merged.bill.usageUnit || "");
    setters.setMonthlySpend(merged.bill.monthlySpend || "");
    setters.setGridTariff(merged.bill.gridTariff || "");
  }

  if (merged.appliance) {
    if (merged.appliance.presetTabId) {
      setters.setAppliancePresetTabId(merged.appliance.presetTabId);
    }
    if (merged.appliance.rows?.length) {
      setters.setApplianceRows(merged.appliance.rows);
    }
  }

  if (merged.custom) {
    if (merged.custom.presetTabId) {
      setters.setCustomPresetTabId(merged.custom.presetTabId);
    }
    if (merged.custom.rows?.length) {
      setters.setCustomRows(merged.custom.rows);
    }
  }

  if (merged.roofArea) setters.setRoofArea(merged.roofArea);
  if (merged.backupDuration) setters.setBackupDuration(merged.backupDuration);
}
