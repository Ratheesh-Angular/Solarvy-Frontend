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
