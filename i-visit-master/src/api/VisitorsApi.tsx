const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface Visitor {
  visitorID: number;
  visitorName: string;
  dateOfBirth?: string;
  idNumber: string;
  idType: string;
  visitorType?: string;
  gender?: string;
  createdAt?: string;
  photoPath?: string;
  archived?: boolean;
  archivedAt?: string | null;
}

export async function listVisitors(): Promise<Visitor[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitors`);
  if (!res.ok) throw new Error("Failed to fetch visitors");
  return res.json();
}

export async function archiveVisitors(ids: number[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/visitors/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ visitorIds: ids }), // field name must match ArchiveVisitorsRequest
  });

  if (!res.ok) {
    let message = `Failed to archive visitors (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) {
        message = data.error;
        if (data.details) {
          message += `: ${data.details}`;
        }
      }
    } catch {
      // ignore JSON parse error; keep default message
    }
    throw new Error(message);
  }
}

export interface RegisterVisitorResponse {
  message: string;
  visitorId: number;
  idImagePath?: string;
  personPhotoPath?: string;
  timestamp?: string;
}

interface RegisterVisitorPayload {
  fullName: string;
  dob: string;
  idNumber: string;
  idType: string;
  visitorType?: string;
  gender?: string;
  idImage?: File;
  personPhoto?: File;
}

export async function registerVisitor(data: RegisterVisitorPayload): Promise<RegisterVisitorResponse> {
  const formData = new FormData();

  formData.append("visitorName", data.fullName);
  formData.append("dob", data.dob);
  formData.append("idNumber", data.idNumber);
  formData.append("idType", data.idType);
  if (data.visitorType) formData.append("visitorType", data.visitorType);
  if (data.gender) formData.append("gender", data.gender);
  if (data.idImage) formData.append("idImage", data.idImage);
  if (data.personPhoto) formData.append("personPhoto", data.personPhoto);

  const res = await fetch(`${API_BASE_URL}/api/visitors/register`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`Visitor registration failed: ${res.status}`);
  return res.json();
}

function extractFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback;

  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(contentDisposition);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return fallback;
}

async function downloadBlobResponse(
  url: string,
  body: unknown,
  token: string | undefined,
  fallbackFilename: string
) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // try to surface server error message if present
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition");
  const filename = extractFilename(contentDisposition, fallbackFilename);

  const urlObject = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlObject;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(urlObject);
}

export async function exportVisitorsPdf(
  visitorIds: number[],
  token: string | undefined
) {
  const url = `${API_BASE_URL}/api/visitors/export/pdf`;
  await downloadBlobResponse(
    url,
    { visitorIds },
    token,
    "visitors-export.pdf"
  );
}

export async function exportVisitorsCsvZip(
  visitorIds: number[],
  token: string | undefined
) {
  const url = `${API_BASE_URL}/api/visitors/export/csv`;
  await downloadBlobResponse(
    url,
    { visitorIds },
    token,
    "visitors-export.zip"
  );
}
