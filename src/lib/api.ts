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

export async function apiPost<T = ApiResponse>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
