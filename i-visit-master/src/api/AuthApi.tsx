const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface EmailVerificationResult {
  userId: number;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  message?: string;
}

export async function verifyEmailToken(token: string): Promise<EmailVerificationResult> {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
    }
  );

  const text = await res.text();

  if (!res.ok) {
    let message = `Verification failed: ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore parse error
    }

    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }

  return JSON.parse(text) as EmailVerificationResult;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/auth/resend-verification?email=${encodeURIComponent(email)}`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    let message = `Resend verification failed: ${res.status}`;
    try {
      const data = JSON.parse(text);
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore
    }

    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }
}
