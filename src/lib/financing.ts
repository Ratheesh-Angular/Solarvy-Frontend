import { apiGet, apiPost } from "./api";
import {
  postFinanceMatches,
  type FinanceExcelPayload,
  type FinanceMatchRow,
  type FinanceMatchesResponse,
} from "./excelApi";

/** Excel Finance_Request!B12 label (e.g. "24-36 months"). */
export type RepaymentPeriod = string;

export type FinancingPreferences = {
  applicantType: string;
  amountToFinance: number;
  depositAvailable: number | null;
  repaymentPeriod: RepaymentPeriod;
  incomeRange: string;
  location: string;
  notes: string;
  consent: boolean;
};

export type FinancingRouteId = "asset-financing" | "instalment" | "eaas";

export const FINANCING_ROUTE_LABELS: Record<FinancingRouteId, string> = {
  "asset-financing": "Asset financing",
  instalment: "Solar instalment plan",
  eaas: "Energy-as-a-Service / lease",
};

export const DEFAULT_FINANCE_ROUTE_LABEL = "Asset financing";

export const FINANCING_ROUTE_ICONS: Record<FinancingRouteId, string> = {
  "asset-financing": "bi-box-seam",
  instalment: "bi-calendar-check",
  eaas: "bi-arrow-repeat",
};

export function isFinancingRouteId(value: unknown): value is FinancingRouteId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FINANCING_ROUTE_LABELS, value)
  );
}

export function routeIdFromLabel(label: string | null | undefined): FinancingRouteId | null {
  const trimmed = String(label || "").trim();
  for (const [id, routeLabel] of Object.entries(FINANCING_ROUTE_LABELS)) {
    if (routeLabel === trimmed) return id as FinancingRouteId;
  }
  return null;
}

export type FinancingPartner = {
  id: string;
  name: string;
  description: string;
  requirements: string[];
};

/** Placeholder partners until Excel Finance_Matches are loaded (Phase 4). */
export const FINANCING_PARTNERS: Record<FinancingRouteId, FinancingPartner[]> =
  {
    "asset-financing": [
      {
        id: "partner-a",
        name: "Financing Partner A",
        description:
          "Asset financing for eligible residential and SME energy equipment.",
        requirements: [
          "Identity / business documentation",
          "Income or revenue evidence",
          "Energy-system quotation / project information",
          "Provider credit and eligibility checks",
        ],
      },
      {
        id: "partner-b",
        name: "Financing Partner B",
        description:
          "Potential equipment-finance route for qualifying energy projects.",
        requirements: [
          "Applicant documentation",
          "Proof of affordability / revenue",
          "Project details and quotation",
          "Provider underwriting",
        ],
      },
    ],
    instalment: [
      {
        id: "partner-a",
        name: "Financing Partner A",
        description:
          "Partner-led instalment plan that spreads the system cost over regular payments.",
        requirements: [
          "Identity documentation",
          "Deposit or down payment",
          "Proof of regular income",
          "Installer quotation",
        ],
      },
      {
        id: "partner-b",
        name: "Financing Partner B",
        description:
          "Flexible instalments for qualifying homes and small businesses.",
        requirements: [
          "Applicant documentation",
          "Affordability check",
          "Project details and quotation",
          "Provider approval",
        ],
      },
    ],
    eaas: [
      {
        id: "partner-a",
        name: "Financing Partner A",
        description:
          "Provider-owned system with a regular service fee for qualifying sites.",
        requirements: [
          "Business / property documentation",
          "Site assessment",
          "Service agreement review",
          "Provider eligibility checks",
        ],
      },
      {
        id: "partner-b",
        name: "Financing Partner B",
        description:
          "Lease arrangement where you pay to use the system over an agreed term.",
        requirements: [
          "Applicant documentation",
          "Proof of revenue",
          "Site and project details",
          "Provider underwriting",
        ],
      },
    ],
  };

/** Fallback repayment options when Excel catalogs are unavailable. */
export const REPAYMENT_OPTIONS: Array<{ id: RepaymentPeriod; label: string }> =
  [
    { id: "12-24 months", label: "12–24 months" },
    { id: "24-36 months", label: "24–36 months" },
    { id: "36+ months", label: "36+ months" },
  ];

export const FINANCE_APPLICANT_FALLBACKS = [
  "Individual / Homeowner",
  "SME",
  "Corporate",
];

export const FINANCE_INCOME_FALLBACKS = [
  "Below 500k",
  "500k-1m",
  "1m-5m",
  "Above 5m",
];

const LEGACY_REPAYMENT: Record<string, string> = {
  "12-24": "12-24 months",
  "24-36": "24-36 months",
  "36+": "36+ months",
};

export function normalizeRepaymentPeriod(value: unknown): RepaymentPeriod {
  const raw = String(value ?? "").trim();
  if (!raw) return "24-36 months";
  if (LEGACY_REPAYMENT[raw]) return LEGACY_REPAYMENT[raw];
  return raw;
}

export function repaymentLabel(id: RepaymentPeriod | null | undefined) {
  if (!id) return null;
  const normalized = normalizeRepaymentPeriod(id);
  return (
    REPAYMENT_OPTIONS.find((o) => o.id === normalized)?.label ?? normalized
  );
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function formatNaira(value: unknown): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

/** 4,000,000 -> "₦4m", 5,282,000 -> "₦5.28m"; below a million falls back to full naira. */
export function formatNairaShort(value: unknown): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  if (Math.abs(n) < 1_000_000) return formatNaira(n);
  const millions = Math.round((n / 1_000_000) * 100) / 100;
  return `₦${millions.toLocaleString("en-NG", { maximumFractionDigits: 2 })}m`;
}

const storageKey = (assessmentId: string) =>
  `solarvy:financing:${assessmentId || "none"}`;

export function saveFinancingRequest(
  assessmentId: string,
  prefs: FinancingPreferences,
) {
  try {
    sessionStorage.setItem(storageKey(assessmentId), JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode / quota) */
  }
}

export function loadFinancingRequest(
  assessmentId: string,
): FinancingPreferences | null {
  try {
    const raw = sessionStorage.getItem(storageKey(assessmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinancingPreferences>;
    if (typeof parsed?.amountToFinance !== "number") return null;
    return {
      applicantType: parsed.applicantType ?? "",
      amountToFinance: parsed.amountToFinance,
      depositAvailable:
        typeof parsed.depositAvailable === "number"
          ? parsed.depositAvailable
          : null,
      repaymentPeriod: normalizeRepaymentPeriod(parsed.repaymentPeriod),
      incomeRange: parsed.incomeRange ?? "",
      location: parsed.location ?? "",
      notes: parsed.notes ?? "",
      consent: Boolean(parsed.consent),
    };
  } catch {
    return null;
  }
}

export function buildFinanceExcelPayload(
  prefs: FinancingPreferences,
  preferredRoute: string = DEFAULT_FINANCE_ROUTE_LABEL,
): FinanceExcelPayload {
  return {
    depositAvailable: prefs.depositAvailable,
    preferredRoute,
    repaymentTerm: normalizeRepaymentPeriod(prefs.repaymentPeriod),
    applicantType: prefs.applicantType,
    location: prefs.location,
    incomeRange: prefs.incomeRange,
    consent: prefs.consent ? "Yes" : "No",
  };
}

export async function syncFinanceMatches(
  assessmentId: string,
  prefs: FinancingPreferences,
  preferredRoute: string = DEFAULT_FINANCE_ROUTE_LABEL,
): Promise<FinanceMatchesResponse> {
  const data = await postFinanceMatches(
    assessmentId,
    buildFinanceExcelPayload(prefs, preferredRoute),
  );
  saveFinanceMatchesCache(assessmentId, preferredRoute, data);
  return data;
}

const matchesStorageKey = (assessmentId: string) =>
  `solarvy:finance-matches:${assessmentId || "none"}`;

export type FinanceMatchesCache = {
  preferredRoute: string;
  amountRequested: number | null;
  requestValid: string | null;
  matches: FinanceMatchRow[];
  savedAt: string;
};

export function saveFinanceMatchesCache(
  assessmentId: string,
  preferredRoute: string,
  data: FinanceMatchesResponse,
) {
  try {
    const payload: FinanceMatchesCache = {
      preferredRoute,
      amountRequested: data.amountRequested,
      requestValid: data.requestValid,
      matches: data.matches ?? [],
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(
      matchesStorageKey(assessmentId),
      JSON.stringify(payload),
    );
  } catch {
    /* storage unavailable */
  }
}

export function loadFinanceMatchesCache(
  assessmentId: string,
): FinanceMatchesCache | null {
  try {
    const raw = sessionStorage.getItem(matchesStorageKey(assessmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinanceMatchesCache>;
    if (!Array.isArray(parsed.matches)) return null;
    return {
      preferredRoute: String(parsed.preferredRoute || ""),
      amountRequested:
        typeof parsed.amountRequested === "number"
          ? parsed.amountRequested
          : null,
      requestValid:
        typeof parsed.requestValid === "string" ? parsed.requestValid : null,
      matches: parsed.matches,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}

/** Map Excel match row to UI partner card shape. */
export function partnerFromMatch(
  row: FinanceMatchRow,
  routeId: FinancingRouteId,
): FinancingPartner {
  const id = String(row.productId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "partner";
  const name = String(row.provider || "Financing partner").trim();
  const routeLabel = FINANCING_ROUTE_LABELS[routeId];
  return {
    id,
    name,
    description: `${routeLabel} for eligible residential and SME energy equipment.`,
    requirements:
      row.requirements?.length > 0
        ? row.requirements
        : String(row.conditions || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
  };
}

export type FinancingEnquiry = {
  id?: number;
  route: FinancingRouteId;
  partnerId: string;
  partnerName: string;
  submittedAt: string;
  reference: string;
  status?: string;
};

export function createFinancingReference(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `SV-FIN-${digits}`;
}

export type SubmitFinancingEnquiryPayload = {
  assessmentId: string;
  financing: FinancingPreferences;
  route: FinancingRouteId;
  partner: FinancingPartner;
  sharedItems: string[];
  confirmAccurate: boolean;
  confirmTerms: boolean;
};

export async function submitFinancingEnquiry({
  assessmentId,
  financing,
  route,
  partner,
  sharedItems,
  confirmAccurate,
  confirmTerms,
}: SubmitFinancingEnquiryPayload): Promise<{
  id: number;
  reference: string;
  submittedAt: string;
  status?: string;
}> {
  const response = await apiPost<{
    success: boolean;
    message?: string;
    data?: {
      id: number;
      reference: string;
      submittedAt: string;
      status?: string;
    };
  }>("/financing-enquiries", {
    assessmentId: assessmentId || null,
    applicantType: financing.applicantType,
    amountToFinance: financing.amountToFinance,
    depositAvailable: financing.depositAvailable,
    repaymentPeriod: financing.repaymentPeriod,
    repaymentLabel: repaymentLabel(financing.repaymentPeriod) ?? "",
    incomeRange: financing.incomeRange,
    location: financing.location,
    notes: financing.notes,
    routeId: route,
    routeLabel: FINANCING_ROUTE_LABELS[route],
    partnerId: partner.id,
    partnerName: partner.name,
    partner: {
      id: partner.id,
      name: partner.name,
      description: partner.description,
      requirements: partner.requirements,
    },
    sharedItems,
    consentShare: financing.consent,
    confirmAccurate,
    confirmTerms,
  });

  if (!response.data?.reference) {
    throw new Error(response.message || "Could not submit financing enquiry");
  }
  return response.data;
}

const selectedPartnerKey = (assessmentId: string, routeId: string) =>
  `solarvy:finance-partner:${assessmentId || "none"}:${routeId}`;

export function saveSelectedPartner(
  assessmentId: string,
  routeId: FinancingRouteId,
  partner: FinancingPartner,
) {
  try {
    sessionStorage.setItem(
      selectedPartnerKey(assessmentId, routeId),
      JSON.stringify(partner),
    );
  } catch {
    /* storage unavailable */
  }
}

export function loadSelectedPartner(
  assessmentId: string,
  routeId: FinancingRouteId,
  partnerId?: string | null,
): FinancingPartner | null {
  try {
    const raw = sessionStorage.getItem(selectedPartnerKey(assessmentId, routeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinancingPartner>;
    if (
      typeof parsed.id !== "string" ||
      typeof parsed.name !== "string" ||
      !Array.isArray(parsed.requirements)
    ) {
      return null;
    }
    if (partnerId && parsed.id !== partnerId) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      description: typeof parsed.description === "string" ? parsed.description : "",
      requirements: parsed.requirements.map(String),
    };
  } catch {
    return null;
  }
}

const enquiryStorageKey = (assessmentId: string) =>
  `solarvy:financing-enquiry:${assessmentId || "none"}`;

export function saveFinancingEnquiry(
  assessmentId: string,
  enquiry: FinancingEnquiry,
) {
  try {
    sessionStorage.setItem(
      enquiryStorageKey(assessmentId),
      JSON.stringify(enquiry),
    );
  } catch {
    /* storage unavailable (private mode / quota) */
  }
}

export function loadFinancingEnquiry(
  assessmentId: string,
): FinancingEnquiry | null {
  try {
    const raw = sessionStorage.getItem(enquiryStorageKey(assessmentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinancingEnquiry>;
    if (
      !isFinancingRouteId(parsed?.route) ||
      typeof parsed.partnerId !== "string" ||
      typeof parsed.partnerName !== "string"
    ) {
      return null;
    }
    return {
      id: typeof parsed.id === "number" ? parsed.id : undefined,
      route: parsed.route,
      partnerId: parsed.partnerId,
      partnerName: parsed.partnerName,
      submittedAt:
        typeof parsed.submittedAt === "string" ? parsed.submittedAt : "",
      reference: typeof parsed.reference === "string" ? parsed.reference : "",
      status: typeof parsed.status === "string" ? parsed.status : undefined,
    };
  } catch {
    return null;
  }
}

export type PublicFinancingEnquiryStatus = {
  id: number;
  reference: string;
  status: string;
  partnerName: string;
  partnerId: string;
  routeId: string;
  routeLabel: string;
  submittedAt: string;
  statusUpdatedAt: string | null;
};

export async function getFinancingEnquiryByReference(reference: string) {
  const response = await apiGet<{
    success: boolean;
    data?: PublicFinancingEnquiryStatus;
    message?: string;
  }>(`/financing-enquiries/by-reference/${encodeURIComponent(reference)}`);
  if (!response.data) {
    throw new Error(response.message || "Could not load financing status");
  }
  return response.data;
}
