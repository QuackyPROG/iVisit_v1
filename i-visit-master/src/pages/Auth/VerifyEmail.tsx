import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Meta from "../../utils/Meta";
import Button from "../../components/common/Button";
import { verifyEmailToken, resendVerificationEmail } from "../../api/AuthApi";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyEmail() {
  Meta({ title: "Verify Email - iVisit" });

  const location = useLocation();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing or invalid verification link.");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setMessage(null);

    (async () => {
      try {
        const result = await verifyEmailToken(token);
        if (cancelled) return;

        setStatus("success");
        setEmail(result.email || null);
        setMessage(result.message || "Your email has been verified successfully.");
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        setStatus("error");
        setMessage(err?.message || "Failed to verify your email.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleGoToSignIn = () => {
    navigate("/sign-in", { replace: true });
  };

  const handleResend = async () => {
    if (!email) return;
    setResendMessage(null);
    setResendLoading(true);
    try {
      await resendVerificationEmail(email);
      setResendMessage("A new verification email has been sent if the account exists and is not yet verified.");
    } catch (err: any) {
      console.error(err);
      setResendMessage(err?.message || "Failed to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  const hasToken = !!token;

  return (
    <div className="min-h-screen p-4 grid place-items-center bg-[url(/background.png)] bg-no-repeat bg-cover">
      <div className="bg-black/60 text-white p-8 rounded-xl max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold text-center">Email Verification</h1>

        {!hasToken && (
          <p className="text-center text-sm text-red-300">
            This verification link is invalid. Please use the link from your email or request a new one.
          </p>
        )}

        {hasToken && status === "loading" && (
          <p className="text-center text-sm text-gray-200">
            Verifying your email. Please wait...
          </p>
        )}

        {hasToken && status === "success" && (
          <>
            <p className="text-center text-sm text-green-300">
              {message || "Your email has been verified successfully."}
            </p>
            {email && (
              <p className="text-center text-xs text-gray-300">
                Verified address: {email}
              </p>
            )}
          </>
        )}

        {hasToken && status === "error" && (
          <>
            <p className="text-center text-sm text-red-300">
              {message || "We could not verify your email. The link may have expired or already been used."}
            </p>
            {email && (
              <p className="text-center text-xs text-gray-300">
                Address on record: {email}
              </p>
            )}
          </>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <Button onClick={handleGoToSignIn}>
            Back to Sign In
          </Button>

          {hasToken && status === "error" && email && (
            <>
              <Button
                variation="secondary"
                disabled={resendLoading}
                onClick={handleResend}
              >
                {resendLoading ? "Resending..." : "Resend verification email"}
              </Button>
              {resendMessage && (
                <p className="text-xs text-center text-gray-300">
                  {resendMessage}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
