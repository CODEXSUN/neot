type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

const apiBaseUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");

export const apiAbsoluteUrl = (path: string) => `${apiBaseUrl}${path}`;
export const apiResourceUrl = (path: string) => `${apiBaseUrl}/api/neot${path}`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authorization = cxappAuthorization();
  const response = await fetch(`${apiBaseUrl}/api/neot${path}`, {
    ...options,
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(authorization ? { Authorization: authorization } : {}),
      ...options.headers
    }
  });
  const text = await response.text();
  if (!text) throw new Error(`NEOT API returned an empty response (${response.status}).`);
  let envelope: ApiEnvelope<T>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`NEOT API returned an invalid response (${response.status}).`);
  }
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Request failed" : envelope.error.message);
  }
  return envelope.data;
}

export const apiGet = <T>(path: string, _scope?: string) => request<T>(path, { method: "GET" });
export const apiPost = <T>(path: string, data?: unknown, _scope?: string) =>
  request<T>(path, { body: JSON.stringify(data ?? {}), method: "POST" });
export const apiPut = <T>(path: string, data?: unknown, _scope?: string) =>
  request<T>(path, { body: JSON.stringify(data ?? {}), method: "PUT" });
export const apiDelete = <T>(path: string, _scope?: string) =>
  request<T>(path, { method: "DELETE" });
export const apiBinaryPost = <T>(path: string, data: Blob, headers: Record<string, string>) =>
  request<T>(path, {
    body: data,
    headers: { "Content-Type": "application/octet-stream", ...headers },
    method: "POST"
  });
export async function apiGetBlob(path: string) {
  const authorization = cxappAuthorization();
  const response = await fetch(`${apiBaseUrl}/api/neot${path}`, {
    headers: authorization ? { Authorization: authorization } : {},
    method: "GET"
  });
  if (!response.ok) {
    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null;
    throw new Error(
      envelope && !envelope.success
        ? envelope.error.message
        : `NEOT API download failed (${response.status}).`
    );
  }
  return response.blob();
}

export function hasLearningManagePermission() {
  if (typeof window === "undefined") return false;
  try {
    const token = window.localStorage.getItem("neot_session") ?? "";
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { permissions?: string[] };
    return payload.permissions?.includes("neot.learning.manage") ?? false;
  } catch {
    return false;
  }
}

function cxappAuthorization() {
  if (typeof window === "undefined") return undefined;
  const token = window.localStorage.getItem("neot_session");
  return token ? `Bearer ${token}` : undefined;
}
