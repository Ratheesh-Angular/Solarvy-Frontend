import type { AssessmentFormData, QuickAssessmentFormData } from "../types/assessment";

/** Home quick-form property value → assessment property card id */
export const PROPERTY_TYPE_TO_ID: Record<string, number> = {
  home: 1,
  hotel: 2,
  factory: 3,
  "commercial building": 4,
  hospital: 5,
  school: 6,
};

/** Home power setup value → assessment power option id */
export const POWER_SETUP_TO_ID: Record<string, number> = {
  "Grid Generator": 1,
  "Grid + Generator": 1,
  "Grid Only": 2,
  "Solar grid": 3,
  "Solar + Grid": 3,
};

/** Home main objective value → assessment objective card id */
export const MAIN_OBJECTIVE_TO_ID: Record<string, string> = {
  "1": "bill",
  "2": "appliance",
  "3": "custom",
};

export function quickFormToAssessmentForm(
  quick: QuickAssessmentFormData,
): Partial<AssessmentFormData> {
  const partial: Partial<AssessmentFormData> = {};

  if (quick.propertyType) {
    const propertyId = PROPERTY_TYPE_TO_ID[quick.propertyType.toLowerCase()];
    if (propertyId) partial.propertyTypeId = propertyId;
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
      usageUnit: "",
      monthlySpend: quick.monthlyElectricityBill,
      gridTariff: "",
    };
  }

  if (quick.powerSetup) {
    const powerId = POWER_SETUP_TO_ID[quick.powerSetup];
    if (powerId) partial.powerSetupId = powerId;
  }

  if (quick.mainObjective) {
    const objectiveId = MAIN_OBJECTIVE_TO_ID[quick.mainObjective];
    if (objectiveId) partial.mainObjectiveId = objectiveId;
  }

  return partial;
}
