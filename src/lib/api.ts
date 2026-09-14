const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) {
    return `${API_BASE}/api${normalizedPath}`;
  }
  return `/api${normalizedPath}`;
}

type ApiResponse<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
};

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

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

export async function apiPost<T = ApiResponse>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed");
  }

  return data;
}

export async function apiGet<T = ApiResponse>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed");
  }

  return data;
}

export async function apiPatch<T = ApiResponse>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed");
  }

  return data;
}

export async function apiPostFormData<T = ApiResponse>(
  path: string,
  formData: FormData,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      ...trackingHeaders(),
    },
    body: formData,
  });

  const data = (await response.json()) as T & { message?: string };

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed");
  }

  return data;
}

export async function checkApiHealth() {
  const response = await fetch(buildApiUrl("/health"));
  return response.json();
}

export type ChatReply = {
  sessionId: string;
  reply: string;
};

export async function sendChatMessage(payload: {
  sessionId?: string;
  message: string;
}): Promise<ChatReply> {
  const data = await apiPost<ApiResponse<ChatReply>>("/chat", payload);
  if (!data.data?.sessionId || typeof data.data.reply !== "string") {
    throw new ApiError(data.message || "Invalid chat response");
  }
  return data.data;
}

export { buildApiUrl };
