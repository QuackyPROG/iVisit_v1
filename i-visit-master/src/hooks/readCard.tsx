// src/hooks/readCard.tsx
const HELPER_BASE_URL = import.meta.env.VITE_HELPER_BASE_URL

export async function readCardUID(): Promise<{ success: boolean; uid?: string; message?: string }> {
  // Note: we now call the local helper app on the port
  const resp = await fetch(`${HELPER_BASE_URL}/api/read-card-uid`, {
    method: 'GET',
  });

  if (!resp.ok) return { success: false, message: `HTTP ${resp.status}` };
  return resp.json();
}
