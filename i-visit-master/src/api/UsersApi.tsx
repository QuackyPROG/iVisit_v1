const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface UserAccount {
  accountID: number;
  username: string;
  password?: string;
  emailAddress: string;
  accountType: string;
  assignedStationIds?: number[];
  active?: boolean | null;
  createdAt?: string;
  emailVerified?: boolean | null;
  emailVerifiedAt?: string | null;
}

export interface AuthResponse {
  userId: number;
  username?: string;
  email: string;
  accountType?: "ADMIN" | "GUARD" | "SUPPORT" | string;
  stationId?: number;
  token?: string;

  twoFactorRequired?: boolean;
  twoFactorSetupRequired?: boolean;
  otpauthUrl?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function authenticateUser(
  email: string,
  password: string,
  stationId?: number | null
): Promise<AuthResponse> {
  const body: any = { email, password };

  if (stationId != null) {
    body.stationId = stationId;
  }

  const res = await fetch(`${API_BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    let message = `Login failed: ${res.status}`;
    let emailNotVerified = false;

    try {
      const data = JSON.parse(text);
      if (data && typeof data.error === "string") {
        message = data.error;
      }
      if (data && data.emailNotVerified === true) {
        emailNotVerified = true;
      }
    } catch {
    }

    const error: any = new Error(message);
    error.status = res.status;
    if (emailNotVerified) {
      error.emailNotVerified = true;
    }
    throw error;
  }

  return JSON.parse(text) as AuthResponse;
}

export async function getAllUsers(): Promise<UserAccount[]> {
  const res = await fetch(`${API_BASE_URL}/api/users`);
  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await res.json();

  // Case 1: backend returns a plain array
  if (Array.isArray(data)) {
    return data;
  }

  // Case 2: backend returns a Page-like object: { content: [...] }
  if (data && Array.isArray(data.content)) {
    return data.content;
  }

  // Fallback: log and return empty list to avoid .map crash
  console.error("Unexpected /api/users response shape:", data);
  return [];
}

export async function getUsersPage(
  page: number,
  size: number,
  q?: string
): Promise<PaginatedResponse<UserAccount>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  if (q && q.trim()) {
    params.set("q", q.trim());
  }

  const res = await fetch(`${API_BASE_URL}/api/users?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function createUser(
  user: Partial<UserAccount>
): Promise<UserAccount> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (!res.ok) {
    let message = "Failed to create user";

    try {
      const text = await res.text();

      if (text) {
        try {
          const data = JSON.parse(text);
          if (typeof data === "string") {
            message = data;
          } else if (data && typeof data.error === "string") {
            message = data.error;
          }
        } catch {
          message = text;
        }
      }
    } catch {
    }

    throw new Error(message);
  }

  return res.json();
}

export async function updateUser(
  id: number,
  user: Partial<UserAccount>
): Promise<UserAccount> {
  const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete user");
}

export async function assignStation(
  userId: number,
  stationId: number
): Promise<UserAccount> {
  const res = await fetch(
    `${API_BASE_URL}/api/users/${userId}/assign-station/${stationId}`,
    {
      method: "POST",
    }
  );
  if (!res.ok) throw new Error("Failed to assign station");
  return res.json();
}

export async function verifyTwoFactor(
  userId: number,
  code: string,
  stationId?: number | null
): Promise<AuthResponse> {
  const body: any = {
    userId,
    code: Number(code),
  };
  if (stationId != null) {
    body.stationId = stationId;
  }

  const res = await fetch(`${API_BASE_URL}/api/users/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = `2FA verification failed: ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
    }
    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }

  return JSON.parse(text) as AuthResponse;
}

export async function resetUserCredentials(
  id: number,
  newPassword: string
): Promise<UserAccount> {
  const res = await fetch(
    `${API_BASE_URL}/api/users/${id}/reset-credentials`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    }
  );
  if (!res.ok) throw new Error("Failed to reset credentials");
  return res.json();
}
