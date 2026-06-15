export type LoadTableRow = {
  id: string;
  kind: string;
  qty: number;
  hours: number;
  power: number;
  loadFactorPct?: number;
};

export type AssessmentFormData = {
  propertyTypeId: number;
  country: string;
  city: string;
  powerSetupId: number;
  inputMethod: "bill" | "appliance" | "custom";
  mainObjectiveId: string;
  monthlyElectricityBill: string;
  bill: {
    fileName: string;
    notes: string;
    monthlyUsage: string;
    usageUnit: string;
    monthlySpend: string;
    gridTariff: string;
  };
  appliance: {
    presetTabId: string;
    rows: LoadTableRow[];
  };
  custom: {
    presetTabId: string;
    rows: LoadTableRow[];
  };
  roofArea: string;
  backupDuration: string;
};

export const EMPTY_ASSESSMENT_FORM: AssessmentFormData = {
  propertyTypeId: 1,
  country: "",
  city: "",
  powerSetupId: 1,
  inputMethod: "bill",
  mainObjectiveId: "bill",
  monthlyElectricityBill: "",
  bill: {
    fileName: "",
    notes: "",
    monthlyUsage: "",
    usageUnit: "",
    monthlySpend: "",
    gridTariff: "",
  },
  appliance: {
    presetTabId: "1-bedroom",
    rows: [],
  },
  custom: {
    presetTabId: "2-bedroom",
    rows: [],
  },
  roofArea: "",
  backupDuration: "",
};

export type QuickAssessmentFormData = {
  propertyType: string;
  location: string;
  monthlyElectricityBill: string;
  powerSetup: string;
  mainObjective: string;
};
