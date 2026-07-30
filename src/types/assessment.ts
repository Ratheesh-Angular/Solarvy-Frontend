export type LoadTableRow = {
  id: string;
  kind: string;
  qty: number;
  hours: number;
  power: number;
  /** Percent 0–100. Mirrors Excel duty cycle / load factor. */
  loadFactorPct?: number;
  /** Appliance_Input row number (template zone 4–20). */
  excelRow?: number;
  /** template = from Appliance_Input A4:A20; user = Add Equipment (A21+). */
  source?: "template" | "user";
  /** Daily kWh from Excel column G at prefill time. */
  dailyKwhExcel?: number;
  /** Hidden from UI; written to Excel with qty=0. */
  removed?: boolean;
};

export type AssessmentFormData = {
  /** Excel label, e.g. "Home", "Commercial" (User_Inputs!B10) */
  propertyType: string;
  /** Dependent template label (User_Inputs!B11) */
  template: string;
  country: string;
  city: string;
  /** Excel label, e.g. "Grid + Generator" (User_Inputs!B13) */
  powerSetup: string;
  inputMethod: "bill" | "appliance" | "custom";
  /** Excel label, e.g. "Reduce Diesel Use" (User_Inputs!B14) */
  mainObjective: string;
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
    rows: LoadTableRow[];
  };
  custom: {
    rows: LoadTableRow[];
  };
  roofArea: string;
  backupDuration: string;
};

export const EMPTY_ASSESSMENT_FORM: AssessmentFormData = {
  propertyType: "",
  template: "",
  country: "",
  city: "",
  powerSetup: "",
  inputMethod: "bill",
  mainObjective: "",
  monthlyElectricityBill: "",
  bill: {
    fileName: "",
    notes: "",
    monthlyUsage: "",
    usageUnit: "kWh",
    monthlySpend: "",
    gridTariff: "",
  },
  appliance: { rows: [] },
  custom: { rows: [] },
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

export type EquipmentCatalogItem = {
  name: string;
  watts: number;
  hoursPerDay: number;
  usagePattern: string;
  dutyCycle: number;
  surgeFactor: number;
  criticalByDefault: string;
};

export type ExcelCatalogs = {
  propertyTypes: string[];
  templatesByProperty: Record<string, string[]>;
  templatesTitle: string;
  categoryDescriptions: Record<string, { bestFor: string; userLabel: string }>;
  powerSetups: string[];
  objectives: string[];
  countries: string[];
  states: string[];
  cities: string[];
  backupDurations: string[];
  equipmentCatalog: EquipmentCatalogItem[];
};

export type TemplatePrefillRow = {
  name: string;
  qty: number;
  watts: number;
  hours: number;
  dutyCycle: number;
  dailyKwh?: number | null;
  excelRow?: number;
  source?: "template" | "user";
};

export type AssessmentResults = {
  assessmentId?: string | number | null;
  scenarioName?: string | null;
  country?: string | null;
  propertyType?: string | null;
  powerSetup?: string | null;
  objective?: string | null;
  recommendedSolarKwp?: number | null;
  recommendedBatteryKwh?: number | null;
  recommendedInverterKw?: number | null;
  annualPvGenerationKwh?: number | null;
  usableSolarKwh?: number | null;
  estimatedSystemCost?: number | null;
  grossAnnualSavings?: number | null;
  annualOmAllowance?: number | null;
  netAnnualSavings?: number | null;
  simplePaybackYears?: number | null;
  dieselSavedLitres?: number | null;
  leadType?: string | number | null;
  recommendedNextStep?: string | number | null;
  primaryRecommendation?: string | null;
  confidenceNote?: string | null;
  disclaimer?: string | null;
  solarShare?: number | null;
  gridOffset?: number | null;
  dieselReduction?: number | null;
  systemClass?: string | null;
  calculationError?: string;
  summary?: Record<string, Record<string, number | null>>;
};
