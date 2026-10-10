import type { BlogPost, BlogSummary } from "./blogApi";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
export const ADMIN_TOKEN_KEY = "solarvy_admin_token";

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) {
    return `${API_BASE}/api${normalizedPath}`;
  }
  return `/api${normalizedPath}`;
}

export type AdminUser = {
  id: number;
  username: string;
};

export type TemplateInfo = {
  path: string;
  fileName: string;
  exists: boolean;
  sizeBytes: number | null;
  sizeLabel: string | null;
  modifiedAt: string | null;
};

export type AiPromptSetting = {
  key: string;
  value: string;
  updatedAt: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  });

  const data = (await response.json()) as ApiEnvelope<T> & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as T;
}

export async function adminLogin(username: string, password: string) {
  const response = await fetch(buildApiUrl("/admin/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = (await response.json()) as ApiEnvelope<{
    token: string;
    user: AdminUser;
  }>;

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  if (!data.data?.token) {
    throw new Error("Login failed");
  }

  setAdminToken(data.data.token);
  return data.data;
}

export async function adminGetMe() {
  const data = await adminFetch<ApiEnvelope<{ user: AdminUser }>>("/admin/me");
  return data.data!.user;
}

export async function adminGetTemplateInfo() {
  const data =
    await adminFetch<ApiEnvelope<TemplateInfo>>("/admin/excel/template");
  return data.data!;
}

export async function adminUploadTemplate(file: File) {
  const token = getAdminToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(buildApiUrl("/admin/excel/template"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = (await response.json()) as ApiEnvelope<TemplateInfo> & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.message || "Upload failed");
  }

  return data.data!;
}

export async function adminDownloadTemplate() {
  const token = getAdminToken();
  const response = await fetch(buildApiUrl("/admin/excel/template/download"), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  const downloadName = decodeURIComponent(
    utfMatch?.[1] || plainMatch?.[1] || "solarvy-calculator.xlsx",
  );

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function adminGetBillPrompt() {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/bill",
  );
  return data.data!;
}

export async function adminSaveBillPrompt(value: string) {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/bill",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  return data.data!;
}

export async function adminGetRecommendationPrompt() {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/recommendation",
  );
  return data.data!;
}

export async function adminSaveRecommendationPrompt(value: string) {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/recommendation",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  return data.data!;
}

export async function adminGetQuickSnapshotRecommendationPrompt() {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/quick-snapshot-recommendation",
  );
  return data.data!;
}

export async function adminSaveQuickSnapshotRecommendationPrompt(
  value: string,
) {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/quick-snapshot-recommendation",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  return data.data!;
}

export async function adminGetChatbotPrompt() {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/chatbot",
  );
  return data.data!;
}

export async function adminSaveChatbotPrompt(value: string) {
  const data = await adminFetch<ApiEnvelope<AiPromptSetting>>(
    "/admin/ai-prompts/chatbot",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
  );
  return data.data!;
}

export type FaqEntry = {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqPayload = {
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function adminListFaqs() {
  const data = await adminFetch<ApiEnvelope<FaqEntry[]>>("/admin/faqs");
  return data.data ?? [];
}

export async function adminCreateFaq(payload: FaqPayload) {
  const data = await adminFetch<ApiEnvelope<FaqEntry>>("/admin/faqs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data!;
}

export async function adminUpdateFaq(id: number, payload: Partial<FaqPayload>) {
  const data = await adminFetch<ApiEnvelope<FaqEntry>>(`/admin/faqs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data!;
}

export async function adminDeleteFaq(id: number) {
  const data = await adminFetch<ApiEnvelope<{ id: number }>>(
    `/admin/faqs/${id}`,
    { method: "DELETE" },
  );
  return data.data!;
}

export type AnalyticsOverview = {
  from: string;
  to: string;
  kpis: {
    uniqueVisitors: number;
    totalSessions: number;
    assessmentStarts: number;
    completedAssessments: number;
    requestIntros: number;
    expertReviews: number;
    quoteUploads: number;
    visitorToAssessmentRate: number;
  };
  charts: {
    visitorsByDay: Array<{ day: string; count: number }>;
    submissionsByDay: Array<{
      day: string;
      assessments: number;
      requestIntros: number;
      expertReviews: number;
      quoteUploads: number;
    }>;
  };
};

export type ActivityItem = {
  id: number;
  visitorId: string | null;
  sessionId: string | null;
  eventType: string;
  path: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ip: string;
  createdAt: string;
};

export type VisitorSummary = {
  id: string;
  userId: string | null;
  userNumber: number | null;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIp: string;
  lastUserAgent: string;
  lastCity: string;
  lastRegion: string;
  lastCountry: string;
  createdAt: string;
  assessmentCount?: number;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

function toQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function adminGetAnalyticsOverview(params: {
  from?: string;
  to?: string;
} = {}) {
  const data = await adminFetch<ApiEnvelope<AnalyticsOverview>>(
    `/admin/analytics/overview${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminGetRecentActivity(limit = 25) {
  const data = await adminFetch<ApiEnvelope<{ items: ActivityItem[] }>>(
    `/admin/analytics/recent${toQuery({ limit })}`,
  );
  return data.data!.items;
}

export async function adminListVisitors(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
} = {}) {
  const data = await adminFetch<ApiEnvelope<PagedResult<VisitorSummary>>>(
    `/admin/visitors${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminGetVisitorDetail(id: string) {
  const data = await adminFetch<ApiEnvelope<Record<string, unknown>>>(
    `/admin/visitors/${encodeURIComponent(id)}`,
  );
  return data.data!;
}

export async function adminListAssessments(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  visitorId?: string;
} = {}) {
  const data = await adminFetch<
    ApiEnvelope<PagedResult<Record<string, unknown>>>
  >(`/admin/assessments${toQuery(params)}`);
  return data.data!;
}

export async function adminGetAssessment(
  id: string,
  params: { visitorId?: string } = {},
) {
  const data = await adminFetch<ApiEnvelope<Record<string, unknown>>>(
    `/admin/assessments/${encodeURIComponent(id)}${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminListRequestIntros(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  visitorId?: string;
} = {}) {
  const data = await adminFetch<
    ApiEnvelope<PagedResult<Record<string, unknown>>>
  >(`/admin/request-intros${toQuery(params)}`);
  return data.data!;
}

export async function adminListExpertReviews(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  visitorId?: string;
} = {}) {
  const data = await adminFetch<
    ApiEnvelope<PagedResult<Record<string, unknown>>>
  >(`/admin/expert-reviews${toQuery(params)}`);
  return data.data!;
}

export async function adminListQuoteUploads(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  visitorId?: string;
} = {}) {
  const data = await adminFetch<
    ApiEnvelope<PagedResult<Record<string, unknown>>>
  >(`/admin/quote-uploads${toQuery(params)}`);
  return data.data!;
}

export type FinancingStatus = "new" | "in_review" | "sent_to_partner" | "closed";

export const FINANCING_STATUS_LABELS: Record<FinancingStatus, string> = {
  new: "New",
  in_review: "In review",
  sent_to_partner: "Sent to partner",
  closed: "Closed",
};

export const FINANCING_STATUS_ORDER: FinancingStatus[] = [
  "new",
  "in_review",
  "sent_to_partner",
  "closed",
];

export function financingStatusLabel(status: string | null | undefined) {
  return (
    FINANCING_STATUS_LABELS[status as FinancingStatus] ?? status ?? "Unknown"
  );
}

export type FinancingProjectSnapshot = {
  assessmentRef?: string | null;
  requestedAssessmentRef?: string | null;
  estimatedSystemCost?: number | null;
  recommendedSolarKwp?: number | null;
  recommendedBatteryKwh?: number | null;
  netAnnualSavings?: number | null;
  propertyType?: string | null;
  city?: string | null;
  state?: string | null;
};

export type FinancingPartnerSnapshot = {
  id?: string;
  name?: string;
  description?: string;
  requirements?: string[];
};

export type AdminFinancingEnquiry = {
  id: number;
  reference: string;
  visitorId: string | null;
  sessionId: string | null;
  assessmentId: number | null;
  assessmentRef: string | null;
  applicantType: string;
  amountToFinance: number | null;
  depositAvailable: number | null;
  repaymentPeriod: string;
  repaymentLabel: string;
  incomeRange: string;
  location: string;
  notes: string;
  routeId: string;
  routeLabel: string;
  partnerId: string;
  partnerName: string;
  partnerSnapshot: FinancingPartnerSnapshot;
  sharedItems: string[];
  projectSnapshot: FinancingProjectSnapshot;
  consentShare: boolean;
  confirmAccurate: boolean;
  confirmTerms: boolean;
  status: FinancingStatus;
  adminNotes: string;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function adminListFinancingEnquiries(params: {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  visitorId?: string;
} = {}) {
  const data = await adminFetch<
    ApiEnvelope<PagedResult<AdminFinancingEnquiry>>
  >(`/admin/financing-enquiries${toQuery(params)}`);
  return data.data!;
}

export async function adminGetFinancingEnquiry(
  id: string | number,
  params: { visitorId?: string } = {},
) {
  const data = await adminFetch<ApiEnvelope<AdminFinancingEnquiry>>(
    `/admin/financing-enquiries/${encodeURIComponent(String(id))}${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminUpdateFinancingEnquiry(
  id: string | number,
  payload: { status?: FinancingStatus; adminNotes?: string },
  params: { visitorId?: string } = {},
) {
  const data = await adminFetch<ApiEnvelope<AdminFinancingEnquiry>>(
    `/admin/financing-enquiries/${encodeURIComponent(String(id))}${toQuery(params)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return data.data!;
}

export type AdminBlogPayload = {
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml?: string;
  featuredImagePath?: string;
  featuredImageAlt?: string;
  category?: string;
  tags?: string[];
  authorName?: string;
  status?: "draft" | "published";
  metaTitle?: string;
  metaDescription?: string;
  ogImagePath?: string;
};

export type BlogDailyPoint = { day: string; views: number; uniqueVisitors: number };

export type BlogAnalyticsOverview = {
  from: string;
  to: string;
  kpis: {
    totalViews: number;
    uniqueVisitors: number;
    postsViewed: number;
    publishedPosts: number;
    draftPosts: number;
    avgViewsPerPost: number;
    previousViews: number;
    previousUniqueVisitors: number;
  };
  daily: BlogDailyPoint[];
};

export type PopularBlogRow = {
  id: number;
  slug: string;
  title: string;
  category: string;
  status: string;
  publishedAt: string | null;
  views: number;
  uniqueVisitors: number;
  lastViewedAt: string | null;
};

export type BlogPostAnalytics = {
  blog: { id: number; slug: string; title: string; status: string };
  from: string;
  to: string;
  kpis: {
    views: number;
    uniqueVisitors: number;
    allTimeViews: number;
    allTimeUniqueVisitors: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
  };
  daily: BlogDailyPoint[];
  referrers: Array<{ source: string; views: number }>;
};

export async function adminListBlogs(params: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const data = await adminFetch<ApiEnvelope<PagedResult<BlogSummary>>>(
    `/admin/blogs${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminGetBlog(id: number) {
  const data = await adminFetch<ApiEnvelope<BlogPost>>(`/admin/blogs/${id}`);
  return data.data!;
}

export async function adminCreateBlog(payload: AdminBlogPayload) {
  const data = await adminFetch<ApiEnvelope<BlogPost>>("/admin/blogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data!;
}

export async function adminUpdateBlog(id: number, payload: Partial<AdminBlogPayload>) {
  const data = await adminFetch<ApiEnvelope<BlogPost>>(`/admin/blogs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data!;
}

export async function adminDeleteBlog(id: number) {
  const data = await adminFetch<ApiEnvelope<{ id: number }>>(`/admin/blogs/${id}`, {
    method: "DELETE",
  });
  return data.data!;
}

export async function adminUploadBlogImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await adminFetch<ApiEnvelope<{ url: string; storagePath: string }>>(
    "/admin/blogs/images",
    { method: "POST", body: formData },
  );
  return data.data!;
}

export async function adminGetBlogAnalyticsOverview(params: {
  from?: string;
  to?: string;
} = {}) {
  const data = await adminFetch<ApiEnvelope<BlogAnalyticsOverview>>(
    `/admin/blogs/analytics/overview${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminGetPopularBlogs(params: {
  from?: string;
  to?: string;
  limit?: number;
} = {}) {
  const data = await adminFetch<ApiEnvelope<{ items: PopularBlogRow[] }>>(
    `/admin/blogs/analytics/popular${toQuery(params)}`,
  );
  return data.data!.items;
}

export async function adminGetBlogPostAnalytics(
  id: number,
  params: { from?: string; to?: string } = {},
) {
  const data = await adminFetch<ApiEnvelope<BlogPostAnalytics>>(
    `/admin/blogs/${id}/analytics${toQuery(params)}`,
  );
  return data.data!;
}

export async function adminDownloadLeadFile(
  kind: "expert-reviews" | "quote-uploads",
  id: number,
  fallbackName: string,
) {
  const token = getAdminToken();
  const response = await fetch(buildApiUrl(`/admin/${kind}/${id}/file`), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let message = "Download failed";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // non-JSON
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
  const downloadName = decodeURIComponent(
    utfMatch?.[1] || plainMatch?.[1] || fallbackName,
  );

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
