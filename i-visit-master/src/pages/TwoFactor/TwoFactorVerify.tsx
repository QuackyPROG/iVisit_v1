import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Meta from "../../utils/Meta";
import { verifyTwoFactor, type AuthResponse } from "../../api/UsersApi";

interface VerifyState {
  userId: number;
  email: string;
  stationId?: number | null;
}

export default function TwoFactorVerify() {
  Meta({ title: "2FA Verification - iVisit" });

  const location = useLocation();
  const navigate = useNavigate();
  const [, setCookie] = useCookies(["role", "username", "stationId", "userId"]);

  const state = location.state as VerifyState | undefined;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!state || !state.userId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="bg-white/10 p-6 rounded-xl">
          <p className="mb-4">Missing 2FA context.</p>
          <Button onClick={() => navigate("/sign-in")}>Back to Sign In</Button>
        </div>
      </div>
    );
  }

  const { userId, email, stationId } = state;

  const finishLoginWithResponse = (res: AuthResponse) => {
    if (res.userId != null) {
      setCookie("userId", res.userId, { path: "/" });
    }
    if (res.username) setCookie("username", res.username, { path: "/" });
    if (res.accountType) {
      const role = res.accountType.toLowerCase();
      setCookie("role", role, { path: "/" });
    }
    const effectiveStationId =
      res.stationId != null ? res.stationId : stationId ?? null;
    if (effectiveStationId != null) {
      setCookie("stationId", effectiveStationId, { path: "/" });
    }
    navigate("/dashboard", { replace: true });
  };

  const handleVerify = async () => {
    setError(null);
    if (!code.trim()) {
      setError("Please enter the 6-digit code from Google Authenticator.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyTwoFactor(userId, code.trim(), stationId);
      if (!res.accountType) {
        setError("2FA verified, but login payload is incomplete.");
        return;
      }
      finishLoginWithResponse(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to verify 2FA code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 grid place-items-center bg-[url(/background.png)] bg-no-repeat bg-cover">
      <div className="bg-black/60 text-white p-8 rounded-xl max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">
          Two-Factor Authentication
        </h1>
        <p className="text-sm text-gray-300 text-center">
          Enter the 6-digit code for <span className="font-semibold">{email}</span>{" "}
          from your authenticator app.
        </p>

        <div className="mt-4">
          <label className="block mb-1 text-sm">6-digit code</label>
          <Input
            className="w-full text-center text-xl tracking-[0.3em]"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {error && (
          <p className="text-red-300 text-xs text-center mt-2">{error}</p>
        )}

        <div className="mt-4 flex gap-3">
          <Button
            className="flex-1"
            disabled={submitting}
            onClick={handleVerify}
          >
            {submitting ? "Verifying..." : "Verify & Continue"}
          </Button>
          <Button
            variation="secondary"
            className="flex-1"
            onClick={() => navigate("/sign-in")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
