export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Request failed");
  }

  return response.json();
}
