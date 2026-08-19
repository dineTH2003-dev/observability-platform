import { Eye, EyeOff, Loader2, Lock, Shield, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PasswordStrength } from "./PasswordStrength";
import type { PasswordChangePayload } from "../../types/user";

type PasswordField = keyof PasswordChangePayload;

interface AccountSettingsProps {
  disabled: boolean;
  errors: Partial<Record<PasswordField, string>>;
  isSaving: boolean;
  values: PasswordChangePayload;
  onChange: (field: PasswordField, value: string) => void;
  onSave: () => void;
}

export function AccountSettings({
  disabled,
  errors,
  isSaving,
  values,
  onChange,
  onSave,
}: AccountSettingsProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(17,25,61,0.98),rgba(9,14,39,0.96))] shadow-[0_24px_80px_rgba(3,8,28,0.42)]">
      <CardContent className="p-6">
        <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-nebula-cyan">
              <Shield className="size-3.5" />
              Security
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Password & Security
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Update your password to keep your account secure.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="size-4" />
              <div>
                <p className="text-sm font-medium">Protected with JWT</p>
                <p className="text-xs text-emerald-200/80">bcrypt encrypted</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <PasswordInput
              disabled={disabled}
              error={errors.currentPassword}
              label="Current Password"
              showPassword={showCurrentPassword}
              togglePassword={() => setShowCurrentPassword((current) => !current)}
              value={values.currentPassword}
              onChange={(value) => onChange("currentPassword", value)}
            />
            <PasswordInput
              disabled={disabled}
              error={errors.newPassword}
              label="New Password"
              showPassword={showNewPassword}
              togglePassword={() => setShowNewPassword((current) => !current)}
              value={values.newPassword}
              onChange={(value) => onChange("newPassword", value)}
            />
            <PasswordInput
              disabled={disabled}
              error={errors.confirmPassword}
              label="Confirm Password"
              showPassword={showConfirmPassword}
              togglePassword={() => setShowConfirmPassword((current) => !current)}
              value={values.confirmPassword}
              onChange={(value) => onChange("confirmPassword", value)}
            />
          </div>

          <PasswordStrength password={values.newPassword} />

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="w-full lg:w-auto h-12 rounded-2xl bg-gradient-to-r from-nebula-purple to-nebula-blue px-6 py-3 font-semibold text-white shadow-lg shadow-nebula-purple/20 hover:from-nebula-purple-dark hover:to-nebula-blue disabled:from-[#1A1F3A] disabled:to-[#1A1F3A] disabled:text-slate-500 disabled:border disabled:border-white/5 disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-50 transition duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Lock className="mr-2 size-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordInput({
  disabled,
  error,
  label,
  showPassword,
  togglePassword,
  onChange,
  value,
}: {
  disabled: boolean;
  error?: string;
  label: string;
  showPassword: boolean;
  togglePassword: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="group relative flex items-center">
        <div
          style={{ left: "28px" }}
          className="pointer-events-none absolute z-10 flex items-center justify-center text-slate-500 transition-colors group-focus-within:text-nebula-cyan"
        >
          <Lock className="size-4" />
        </div>
        <Input
          type={showPassword ? "text" : "password"}
          disabled={disabled}
          value={value}
          style={{ paddingLeft: "60px" }}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className="h-12 rounded-xl border-white/8 bg-[#0A1238] !pl-16 pr-12 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/20 transition duration-200 hover:border-white/12 focus-visible:ring-nebula-purple/30 disabled:opacity-70"
        />
        <button
          type="button"
          aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
          onClick={togglePassword}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-white"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
      ) : null}
    </div>
  );
}
