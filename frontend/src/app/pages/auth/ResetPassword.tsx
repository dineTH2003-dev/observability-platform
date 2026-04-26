import { useState } from "react";
import axios from "axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import logoImage from "../../../assets/logo.png";
import { Eye, EyeOff } from "lucide-react";

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

export function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    //Confirm password validation
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      await axios.post("http://localhost:9000/api/auth/reset-password", {
        token,
        newPassword: password,
      });

      alert("Password reset successful");

      //Redirect to login
      onBackToLogin();

    } catch (err: any) {
      alert(err.response?.data?.message || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">

      {/* Left Panel */}
      <div className="w-1/2 h-screen bg-nebula-navy-dark flex items-center justify-center">
        <div className="w-full max-w-md px-12">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-white mb-2">
              Reset Password
            </h1>
            <p className="text-slate-400 text-sm">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
            <Label className="text-white text-sm mb-2 block">
                New Password
            </Label>

            <div className="relative w-full">
                <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pr-12 bg-nebula-navy-light border-nebula-navy-lighter text-white"
                    required
                />

                <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-white"
                >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            </div>

            <div>
            <Label className="text-white text-sm mb-2 block">
                Confirm Password
            </Label>

            <div className="relative w-full">
                <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 pr-12 bg-nebula-navy-light border-nebula-navy-lighter text-white"
                required
                />

                <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 hover:text-white"
                >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 text-white mt-6"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

          </form>

          {/* Back to login */}
          <div className="text-center mt-6">
            <button
            onClick={() => {
                window.location.href = "/";
            }}
            className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
            Back to Login
            </button>
          </div>

          <div className="text-center mt-6 text-slate-500 text-xs">
            ©2026 CloudSight. All Rights Reserved.
          </div>

        </div>
      </div>

      {/* Right Panel */}
      <div className="w-1/2 h-screen bg-gradient-to-br from-nebula-purple via-purple-500 to-nebula-pink flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <img src={logoImage} className="w-48 h-48" />
          <h1 className="text-5xl font-bold text-white">CloudSight</h1>
        </div>
      </div>

    </div>
  );
}