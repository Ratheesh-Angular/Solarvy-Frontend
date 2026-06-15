import { apiGet, apiPatch, apiPost } from "./api";
import type { AssessmentFormData } from "../types/assessment";

type DraftResponse = {
  success: boolean;
  data: {
    id: number;
    formData: AssessmentFormData;
    createdAt: string;
    updatedAt: string;
  };
};

type AssessmentResponse = {
  success: boolean;
  data: {
    id: number;
    draftId: number | null;
    formData: AssessmentFormData;
    createdAt: string;
  };
};

export async function createAssessmentDraft(formData: Partial<AssessmentFormData>) {
  const response = await apiPost<DraftResponse>("/assessments/drafts", { formData });
  return response.data;
}

export async function getAssessmentDraft(id: number) {
  const response = await apiGet<DraftResponse>(`/assessments/drafts/${id}`);
  return response.data;
}

export async function updateAssessmentDraft(id: number, formData: AssessmentFormData) {
  const response = await apiPatch<DraftResponse>(`/assessments/drafts/${id}`, {
    formData,
  });
  return response.data;
}

export async function completeAssessmentDraft(id: number, formData: AssessmentFormData) {
  const response = await apiPost<AssessmentResponse>(
    `/assessments/drafts/${id}/complete`,
    { formData },
  );
  return response.data;
}

export async function completeAssessment(formData: AssessmentFormData) {
  const response = await apiPost<AssessmentResponse>("/assessments/complete", {
    formData,
  });
  return response.data;
}
