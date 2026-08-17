import { apiGet, apiPost, ApiError } from "./api";
import type {
  AssessmentFormData,
  ExcelCatalogs,
  LiveSummaryResponse,
  TemplatePrefillRow,
} from "../types/assessment";

type CatalogsResponse = { success: boolean; data: ExcelCatalogs };

type PrefillResponse = {
  success: boolean;
  data: {
    applianceRows: TemplatePrefillRow[];
    summary: { dailyKwh: number | null; monthlyKwh: number | null };
  };
};

type BillExtractResponse = {
  success: boolean;
  data: {
    fileName: string;
    monthlyUsage: number | null;
    monthlySpend: number | null;
    gridTariff: number | null;
    fieldsDetected: number;
    confidence?: number;
    confidenceMin?: number;
    lowConfidence?: boolean;
    warnings?: string[];
    source?: string;
  };
};

export async function getExcelCatalogs() {
  const response = await apiGet<CatalogsResponse>("/excel/catalogs");
  return response.data;
}

export async function getTemplatePrefill(propertyType: string, template: string) {
  const response = await apiPost<PrefillResponse>("/excel/template-prefill", {
    propertyType,
    template,
  });
  return response.data;
}

type LiveSummaryApiResponse = { success: boolean; data: LiveSummaryResponse };

export async function getLiveSummary(formData: AssessmentFormData) {
  const response = await apiPost<LiveSummaryApiResponse>("/excel/live-summary", {
    formData,
  });
  return response.data;
}

export async function extractBillValues(
  file: File,
  options?: {
    formData?: AssessmentFormData;
    monthlyEnergyKwh?: number | null;
  },
) {
  const formData = new FormData();
  formData.append("bill", file);
  if (options?.formData) {
    formData.append("formData", JSON.stringify(options.formData));
  }
  if (
    options?.monthlyEnergyKwh !== undefined &&
    options?.monthlyEnergyKwh !== null
  ) {
    formData.append("monthlyEnergyKwh", String(options.monthlyEnergyKwh));
  }

  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/api/bills/extract`;

  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: formData });
  } catch {
    throw new ApiError(
      "Could not reach the API. Make sure the backend is running on port 5000.",
    );
  }

  let data: BillExtractResponse & { message?: string };
  try {
    data = (await response.json()) as BillExtractResponse & {
      message?: string;
    };
  } catch {
    throw new ApiError(
      response.status === 502
        ? "Bill extraction timed out or the API restarted. Please try again."
        : "Bill extraction failed",
    );
  }

  if (!response.ok) {
    throw new ApiError(data.message || "Bill extraction failed");
  }

  return data.data;
}
