import { ApiError } from "./api";
import type { AuthUser } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
const TOKEN_KEY = "solarvy_user_token";

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (API_BASE) {
    return `${API_BASE}/api${normalizedPath}`;
  }
  return `/api${normalizedPath}`;
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

function authHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // ignore
  }
  return {};
}

type AuthResponse = {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: AuthUser;
  };
};

type SimpleResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & {
    message?: string;
    code?: string;
  };
  if (!response.ok) {
    throw new ApiError(data.message || "Request failed", {
      code: data.code,
      status: response.status,
    });
  }
  return data;
}

export async function requestSignupOtp(body: {
  fullName: string;
  phoneE164: string;
  email: string;
}): Promise<SimpleResponse> {
  const response = await fetch(buildApiUrl("/auth/signup/request-otp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function verifySignupOtp(body: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  const response = await fetch(buildApiUrl("/auth/signup/verify-otp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function requestLoginOtp(body: {
  email: string;
}): Promise<SimpleResponse> {
  const response = await fetch(buildApiUrl("/auth/login/request-otp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function verifyLoginOtp(body: {
  email: string;
  code: string;
}): Promise<AuthResponse> {
  const response = await fetch(buildApiUrl("/auth/login/verify-otp"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function authWithGoogle(body: {
  idToken: string;
  fullName?: string;
  phoneE164?: string;
}): Promise<AuthResponse> {
  const response = await fetch(buildApiUrl("/auth/google"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function fetchAuthMe(): Promise<{
  success: boolean;
  data?: AuthUser;
  message?: string;
}> {
  const response = await fetch(buildApiUrl("/auth/me"), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...trackingHeaders(),
      ...authHeaders(),
    },
  });
  return parseJson(response);
}

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";
}

export function getUserAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
