export type RepaymentPeriod = "12-24" | "24-36" | "36+";

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

export type FinancingPartner = {
  id: string;
  name: string;
  description: string;
  requirements: string[];
};

/** Placeholder partners until live partner data is available. */
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

export const REPAYMENT_OPTIONS: Array<{ id: RepaymentPeriod; label: string }> =
  [
    { id: "12-24", label: "12–24 months" },
    { id: "24-36", label: "24–36 months" },
    { id: "36+", label: "36+ months" },
  ];

export function repaymentLabel(id: RepaymentPeriod | null | undefined) {
  return REPAYMENT_OPTIONS.find((o) => o.id === id)?.label ?? null;
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
      repaymentPeriod: repaymentLabel(parsed.repaymentPeriod)
        ? (parsed.repaymentPeriod as RepaymentPeriod)
        : "24-36",
      incomeRange: parsed.incomeRange ?? "",
      location: parsed.location ?? "",
      notes: parsed.notes ?? "",
      consent: Boolean(parsed.consent),
    };
  } catch {
    return null;
  }
}

export type FinancingEnquiry = {
  route: FinancingRouteId;
  partnerId: string;
  partnerName: string;
  submittedAt: string;
  reference: string;
};

export function createFinancingReference(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `SV-FIN-${digits}`;
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
      route: parsed.route,
      partnerId: parsed.partnerId,
      partnerName: parsed.partnerName,
      submittedAt:
        typeof parsed.submittedAt === "string" ? parsed.submittedAt : "",
      reference: typeof parsed.reference === "string" ? parsed.reference : "",
    };
  } catch {
    return null;
  }
}
