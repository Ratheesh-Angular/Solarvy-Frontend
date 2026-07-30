import type { AssessmentFormData, QuickAssessmentFormData } from "../types/assessment";

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
  const partial: Partial<AssessmentFormData> = {};

  if (quick.propertyType) {
    const label = PROPERTY_TYPE_TO_LABEL[quick.propertyType.toLowerCase()];
    if (label) partial.propertyType = label;
  }

  if (quick.location) {
    partial.country = quick.location;
  }

  if (quick.monthlyElectricityBill) {
    partial.monthlyElectricityBill = quick.monthlyElectricityBill;
    partial.bill = {
      fileName: "",
      notes: "",
      monthlyUsage: "",
      usageUnit: "kWh",
      monthlySpend: quick.monthlyElectricityBill,
      gridTariff: "",
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
