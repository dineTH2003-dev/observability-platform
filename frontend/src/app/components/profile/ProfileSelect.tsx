import type { LucideIcon } from "lucide-react";

import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ProfileSelectOption {
  label: string;
  value: string;
}

interface ProfileSelectProps {
  disabled?: boolean;
  error?: string;
  icon: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  options: ProfileSelectOption[];
  placeholder?: string;
  value: string;
}

export function ProfileSelect({
  disabled = false,
  error,
  icon: Icon,
  label,
  onChange,
  options,
  placeholder = "Select an option",
  value,
}: ProfileSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-white">{label}</Label>
      <div className="group relative flex items-center">
        <div className="pointer-events-none absolute left-5 z-10 flex items-center justify-center text-slate-500 transition-colors group-focus-within:text-nebula-cyan">
          <Icon className="size-4" />
        </div>
        <Select disabled={disabled} value={value} onValueChange={onChange}>
          <SelectTrigger
            aria-invalid={Boolean(error)}
            className="h-12 rounded-xl border-white/8 bg-[#0A1238] pl-14 pr-10 text-left text-sm text-white shadow-inner shadow-black/20 transition duration-200 hover:border-white/12 focus-visible:ring-nebula-purple/30 disabled:opacity-70"
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/8 bg-[#11193D] text-white shadow-xl shadow-black/40">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="rounded-xl py-2 text-white focus:bg-white/8 focus:text-white"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
