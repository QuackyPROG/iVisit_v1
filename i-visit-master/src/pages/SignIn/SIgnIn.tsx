// src/pages/SignIn/SignIn.tsx
import Meta from "../../utils/Meta";
import iVisitLogo from "../../assets/images/logo.png";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import {
  authenticateUser, getStationInfo, resendVerificationEmail
} from "../../api/Index";
import DashboardIndexRedirect from "../../routes/DashboardIndexRedirect";

// simple frontend email validator
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 5-minute cooldown for resend verification
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

export default function SignIn() {
  Meta({ title: "Sign In - iVisit" });

  const navigate = useNavigate();
  const [cookies, setCookie] = useCookies(["role", "username", "stationId", "userId"]);
  const role = cookies.role as "admin" | "guard" | "support" | undefined;
  const locationA = useLocation();

  // If already logged in, don't show SignIn at all
  if (role) {
    const from = (locationA.state as any)?.from as string | undefined;

    if (from && from.startsWith("/dashboard")) {
      return <Navigate to={from} replace />;
    }

    // Otherwise, use existing dashboard landing logic
    return <DashboardIndexRedirect />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);           // global error
  const [emailError, setEmailError] = useState<string | null>(null); // field-level
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // email verification + resend
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [lastResendAt, setLastResendAt] = useState<number | null>(null);

  const validateForm = (): boolean => {
    let ok = true;
    setEmailError(null);
    setPasswordError(null);

    if (!email) {
      setEmailError("Email is required.");
      ok = false;
    } else if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      ok = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      ok = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      ok = false;
    }

    return ok;
  };

  const handleSignIn = async (e?: React.SyntheticEvent) => {
    e?.preventDefault?.();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1) Try to get stationId from helper (for guards)
      let stationId: number | null = null;
      try {
        const stationInfo = await getStationInfo();
        const raw = stationInfo?.stationId;
        if (raw != null) {
          const asNumber =
            typeof raw === "number" ? raw : Number.parseInt(raw as string, 10);
          if (!Number.isNaN(asNumber)) {
            stationId = asNumber;
          }
        }
      } catch (helperErr) {
        console.warn(
          "Helper app not reachable or stationId missing. Proceeding without station binding.",
          helperErr
        );
      }

      // 2) Call backend login
      const res = await authenticateUser(email, password, stationId);
      console.log("login response from backend:", res);

      if (!res) {
        setError("Invalid login response from server.");
        return;
      }

      // 2FA: first-time setup
      if (res.twoFactorSetupRequired) {
        navigate("/two-factor/setup", {
          state: {
            userId: res.userId,
            email: res.email,
            stationId: res.stationId ?? stationId ?? null,
            otpauthUrl: res.otpauthUrl ?? null,
          },
          replace: true,
        });
        return;
      }

      // 2FA: normal login (code required)
      if (res.twoFactorRequired) {
        navigate("/two-factor/verify", {
          state: {
            userId: res.userId,
            email: res.email,
            stationId: res.stationId ?? stationId ?? null,
          },
          replace: true,
        });
        return;
      }

      // No 2FA? (shouldn't really happen once requirement is enforced,
      // but keep for fallback / admin etc.)
      if (!res.accountType) {
        setError("Invalid account or credentials.");
        return;
      }

      if (res.userId != null) {
        setCookie("userId", res.userId, { path: "/" });
      }

      if (res.username) setCookie("username", res.username, { path: "/" });

      const role = res.accountType.toLowerCase(); // 'admin' | 'guard' | 'support'
      setCookie("role", role, { path: "/" });

      // Prefer stationId from backend if present
      const effectiveStationId =
        res.stationId != null ? res.stationId : stationId;
      if (effectiveStationId != null) {
        setCookie("stationId", effectiveStationId, { path: "/" });
      }

      location.replace("/dashboard");
    } catch (err: any) {
      console.error(err);

      const status = err?.status as number | undefined;
      const backendMessage = (err?.message as string | undefined) || "";

      let msg = "Failed to sign in. Please try again.";
      setEmailNotVerified(false);
      setResendMessage(null);

      if (status === 404) {
        msg = "No account found with this email address.";
      } else if (status === 401) {
        msg = "Incorrect email or password.";
      } else if (status === 400) {
        if (backendMessage.toLowerCase().includes("not linked to any station")) {
          msg =
            "This device is not linked to a station. Please start the helper app and try again.";
        } else {
          msg = backendMessage || "Invalid login request.";
        }
      } else if (status === 403) {
        if (err?.emailNotVerified) {
          msg =
            "Your email is not verified. Please check your inbox for the verification link.";
          setEmailNotVerified(true);
        } else {
          const lower = backendMessage.toLowerCase();
          if (lower.includes("deactivated")) {
            msg = "Your account is deactivated. Please contact your administrator.";
          } else if (lower.includes("not assigned")) {
            msg = "You are not assigned to this station/device.";
          } else {
            msg = backendMessage || "You do not have permission to sign in here.";
          }
        }
      } else if (status && status >= 500) {
        msg = "Server error while signing in. Please try again later.";
      } else if (
        backendMessage &&
        !backendMessage.startsWith("Login failed:")
      ) {
        msg = backendMessage;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

    const handleResendVerification = async () => {
    setResendMessage(null);

    if (!email || !isValidEmail(email)) {
      setResendMessage("Please enter a valid email address first.");
      return;
    }

    const now = Date.now();
    if (lastResendAt != null && now - lastResendAt < RESEND_COOLDOWN_MS) {
      const remainingMs = RESEND_COOLDOWN_MS - (now - lastResendAt);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      setResendMessage(
        `You can request another verification email in about ${remainingMinutes} minute(s).`
      );
      return;
    }

    try {
      setResendLoading(true);
      await resendVerificationEmail(email);
      setLastResendAt(now);
      setResendMessage(
        "If this email address is registered and not yet verified, a new verification email has been sent."
      );
    } catch (err: any) {
      console.error(err);
      setResendMessage(
        err?.message || "Failed to resend verification email."
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-10 grid place-items-center bg-[url(/background.png)] bg-no-repeat bg-cover">
      <div className="size-full backdrop-blur-lg max-w-[70em] h-fit flex flex-col gap-4 justify-between items-center bg-white/10 rounded-xl">
        <div className="border-b-white/40 border-b-2 w-full py-4 mb-auto text-center text-white">
          <h1 className="text-xl">User Management Portal</h1>
        </div>

        <div className="relative w-fit">
          <img
            className="w-60 h-auto
              [mask-image:linear-gradient(to_bottom,black,transparent)]
              [mask-repeat:no-repeat]
              [mask-size:100%_100%]
              [-webkit-mask-image:linear-gradient(to_bottom,black,transparent)]
              [-webkit-mask-repeat:no-repeat]
              [-webkit-mask-size:100%_100%]"
            src={iVisitLogo}
            alt="Logo"
          />
          <span className="absolute inset-0 flex items-end justify-center text-white text-8xl font-tomorrow">
            iVisit
          </span>
        </div>

        <h3 className="text-white text-2xl">Welcome Back!</h3>

        <form className="space-y-3 px-4 w-full flex flex-col items-center" onSubmit={handleSignIn}>
          <div className="form-group w-full max-w-96">
            <label htmlFor="email" className="text-white">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              className="text-xl max-w-96 w-full"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              required
            />
            {/* Reserve space for field error to avoid jumping */}
            <p className="text-red-300 text-xs mt-1 min-h-[1rem]">
              {emailError ?? " "}
            </p>
          </div>

          <div className="form-group w-full max-w-96">
            <label htmlFor="password" className="text-white">
              Password
            </label>
            <Input
              id="password"
              type="password"
              className="text-xl max-w-96 w-full"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              required
            />
            {/* Reserve space for field error to avoid jumping */}
            <p className="text-red-300 text-xs mt-1 min-h-[1rem]">
              {passwordError ?? " "}
            </p>
          </div>

          {/* Global error area with fixed height so layout is stable */}
          <div className="w-full max-w-96 min-h-[1.5rem] flex items-center justify-center">
            {error && (
              <p className="text-red-400 text-center text-sm font-semibold">
                {error}
              </p>
            )}
          </div>

                    {emailNotVerified && (
            <div className="w-full max-w-96 flex flex-col items-center gap-2">
              <Button
                type="button"
                disabled={resendLoading}
                onClick={handleResendVerification}
                className="max-w-80 w-full"
              >
                {resendLoading ? "Sending..." : "Resend verification email"}
              </Button>
              {resendMessage && (
                <p className="text-xs text-center text-slate-200">
                  {resendMessage}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2 w-full max-w-96">
            <Button
              disabled={loading}
              onClick={handleSignIn}
              className="max-w-80 w-full"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </div>
        </form>

        <span className="mb-10 max-w-80 w-full text-white"> </span>
      </div>
    </div>
  );
}
