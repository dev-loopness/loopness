// Small helpers used by the browser-side components.

export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

export function hoursLabel(h: number) {
  if (h < 24) return `about ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `about ${d} day${d === 1 ? "" : "s"}`;
}
