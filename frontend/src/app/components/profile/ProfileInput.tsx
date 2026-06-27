import type { LucideIcon } from "lucide-react";

import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ProfileInputProps {
  disabled?: boolean;
  error?: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}

export function ProfileInput({
  disabled = false,
  error,
  icon: Icon,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: ProfileInputProps) {
  return (
    <div className="space-y-2.5">
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-slate-500 transition-colors group-focus-within:text-nebula-cyan">
          <Icon className="size-4" />
        </div>
        <Input
          type={type}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className="h-12 rounded-xl border-white/8 bg-[#0A1238] pl-12 pr-4 text-white placeholder:text-slate-500 shadow-inner shadow-black/20 transition duration-200 hover:border-white/12 focus-visible:ring-nebula-purple/30 disabled:opacity-70"
        />
      </div>
      <p className="min-h-4 text-xs text-red-400">{error || ""}</p>
    </div>
  );
}
