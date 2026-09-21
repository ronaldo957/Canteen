export class ApiError extends Error {}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed with status ${res.status}`);
  }
  return data as T;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: "customer" | "admin" | "kitchen" | "cashier";
  phone?: string | null;
  avatarUrl?: string | null;
}
