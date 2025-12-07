// src/api/Http.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } catch (err: any) {
    // AbortError = timeout, others = network drop
    throw new NetworkError(err?.message || "Network request failed");
  } finally {
    clearTimeout(id);
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs?: number
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  return fetchWithTimeout(url, init, timeoutMs);
}
