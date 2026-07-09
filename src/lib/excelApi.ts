import { apiGet, apiPost, ApiError } from "./api";
import type {
  ExcelCatalogs,
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

export async function extractBillValues(file: File) {
  const formData = new FormData();
  formData.append("bill", file);

  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/api/bills/extract`;

  const response = await fetch(url, { method: "POST", body: formData });
  const data = (await response.json()) as BillExtractResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new ApiError(data.message || "Bill extraction failed");
  }

  return data.data;
}
