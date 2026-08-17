import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import logoImage from "../../../assets/logo.png";
import { authService } from "../../services/authService";

interface VerifyEmailProps {
  onBackToLogin: () => void;
}

type VerifyState = "loading" | "success" | "error";

export function VerifyEmail({ onBackToLogin }: VerifyEmailProps) {
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Verifying your email address...");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setState("error");
      setMessage("This verification link is invalid or has expired.");
      return;
    }

    let mounted = true;

    authService
      .verifyEmail(token)
      .then(() => {
        if (!mounted) return;
        setState("success");
        setMessage("Your email address has been successfully verified.");
      })
      .catch((error: any) => {
        if (!mounted) return;
        setState("error");
        setMessage(error.response?.data?.message || "This verification link is invalid or has expired.");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isSuccess = state === "success";
  const isLoading = state === "loading";

  return (
    <div className="min-h-screen w-full flex">
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-nebula-navy-lighter bg-nebula-navy-light">
            {isLoading ? (
              <Loader2 className="size-8 animate-spin text-nebula-purple" />
            ) : isSuccess ? (
              <CheckCircle2 className="size-8 text-emerald-400" />
            ) : (
              <AlertCircle className="size-8 text-red-400" />
            )}
          </div>

          <h1 className="text-3xl font-semibold text-white mb-3">
            {isLoading ? "Verifying Email" : isSuccess ? "Email Verified!" : "Email Verification Failed"}
          </h1>
          <p className="text-slate-400 text-sm leading-6 mb-8">
            {message}
            {isSuccess && " You can now sign in to CloudSight."}
          </p>

          <Button
            type="button"
            onClick={onBackToLogin}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-nebula-purple to-nebula-blue hover:from-nebula-purple-dark hover:to-nebula-blue text-white font-medium"
          >
            {isSuccess ? "Sign In" : "Back to Sign In"}
          </Button>

          <p className="text-xs text-slate-500 mt-8">©2026 CloudSight. All Rights Reserved.</p>
        </div>
      </div>

      <div className="w-1/2 h-screen bg-gradient-to-br from-nebula-purple via-purple-500 to-nebula-pink flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-6">
          <img
            src={logoImage}
            alt="CloudSight Logo"
            className="w-48 h-48 object-contain drop-shadow-2xl"
          />
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">CloudSight</h1>
        </div>
      </div>
    </div>
  );
}
