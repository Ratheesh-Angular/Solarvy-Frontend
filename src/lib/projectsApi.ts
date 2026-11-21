import { ApiError, buildApiUrl } from "./api";
import { getUserAuthToken } from "./authApi";

type ProjectsEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type ProjectViewer = {
  visitorId: string | null;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  kind: "guest" | "account";
  isAuthenticated: boolean;
  isGuest: boolean;
  scope: "current_browser" | "account";
};

export type ProjectInstaller = {
  installerName: string;
  cardNumber: number | null;
  matchPct: number | null;
  matchTier: string | null;
  bestSuitedFor: string | null;
  coverage: string | null;
  strengths: string | null;
  pricing: string | null;
  response: string | null;
};

export type SubmittedRequestIntro = {
  id: number;
  installerName: string;
  projectTimeline: string | null;
  email: string | null;
  submittedAt: string | null;
  status: string;
};

export type SubmittedExpertReview = {
  id: number;
  installerName: string;
  reviewType: string | null;
  projectLocation: string | null;
  hasAttachment: boolean;
  submittedAt: string | null;
  status: string;
};

export type SubmittedQuoteUpload = {
  id: number;
  fileName: string;
  location: string | null;
  submittedAt: string | null;
  status: string;
};

export type SubmittedFinancing = {
  id: number;
  reference: string;
  routeLabel: string;
  partnerName: string;
  amountToFinance: number | null;
  submittedAt: string | null;
  status: string;
  statusUpdatedAt: string | null;
};

export type ProjectTimelineItem = {
  kind: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  reference?: string;
};

export type CustomerProject = {
  assessmentId: number;
  assessmentRef: string;
  createdAt: string | null;
  updatedAt: string | null;
  latestActivityAt: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  };
  propertyType: string | null;
  powerSetup: string | null;
  objective: string | null;
  inputMethod: string | null;
  snapshot: {
    recommendedSolarKwp: number | null;
    recommendedBatteryKwh: number | null;
    estimatedSystemCost: number | null;
    netAnnualSavings: number | null;
    simplePaybackYears: number | null;
    primaryRecommendation: string | null;
    confidenceNote: string | null;
    calculationError: string | null;
  };
  installers: {
    viewedAt: string | null;
    count: number;
    bestMatch: ProjectInstaller | null;
    items: ProjectInstaller[];
  };
  progress: {
    resultsViewed: boolean;
    pdfDownloaded: boolean;
    installersViewed: boolean;
    requestedIntro: boolean;
    requestedExpertReview: boolean;
    uploadedQuote: boolean;
    requestedFinancing: boolean;
  };
  requestIntros: SubmittedRequestIntro[];
  expertReviews: SubmittedExpertReview[];
  quoteUploads: SubmittedQuoteUpload[];
  financing: SubmittedFinancing[];
  timeline: ProjectTimelineItem[];
  latestFinancingStatus: string | null;
};

export type ProjectsSummary = {
  totalProjects: number;
  totalRequestIntros: number;
  totalExpertReviews: number;
  totalQuoteUploads: number;
  totalFinancingEnquiries: number;
};

export type ProjectsWorkspace = {
  viewer: ProjectViewer;
  summary: ProjectsSummary;
  projects: CustomerProject[];
  otherActions: {
    requestIntros: SubmittedRequestIntro[];
    expertReviews: SubmittedExpertReview[];
    quoteUploads: SubmittedQuoteUpload[];
    financing: SubmittedFinancing[];
  };
};

function trackingHeaders(): Record<string, string> {
  try {
    const visitorId = localStorage.getItem("solarvy_visitor_id");
    const sessionId = localStorage.getItem("solarvy_session_id");
    const headers: Record<string, string> = {};
    if (visitorId) headers["X-Visitor-Id"] = visitorId;
    if (sessionId) headers["X-Session-Id"] = sessionId;
    return headers;
  } catch {
    return {};
  }
}

export async function getProjectsWorkspace(): Promise<ProjectsWorkspace> {
  const token = getUserAuthToken();
  const response = await fetch(buildApiUrl("/projects"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = (await response.json()) as ProjectsEnvelope<ProjectsWorkspace>;
  if (!response.ok || !data.data) {
    throw new ApiError(data.message || "Could not load your projects", {
      status: response.status,
    });
  }
  return data.data;
}
