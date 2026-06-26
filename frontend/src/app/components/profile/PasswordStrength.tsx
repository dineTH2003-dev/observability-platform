interface PasswordStrengthProps {
  password: string;
}

const checks = [
  { key: "length", test: (value: string) => value.length >= 8 },
  { key: "uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lowercase", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", test: (value: string) => /\d/.test(value) },
  { key: "special", test: (value: string) => /[^A-Za-z\d]/.test(value) },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const completed = password ? checks.filter((check) => check.test(password)).length : 0;
  const { label, width, toneClass } = getStrengthPresentation(password, completed);

  return (
    <div className="space-y-3 rounded-2xl border border-white/8 bg-[#0A1238]/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Password Strength</p>
          <p className="text-xs text-slate-500">Live validation updates as you type.</p>
        </div>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${toneClass.badge}`}>
          {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${toneClass.bar}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function getStrengthPresentation(password: string, completed: number) {
  if (!password) {
    return {
      label: "Very Weak",
      width: 0,
      toneClass: {
        badge: "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]",
        bar: "bg-[#EF4444]",
      },
    };
  }

  if (completed <= 1) {
    return {
      label: "Very Weak",
      width: 20,
      toneClass: {
        badge: "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]",
        bar: "bg-[#EF4444]",
      },
    };
  }

  if (completed === 2) {
    return {
      label: "Weak",
      width: 40,
      toneClass: {
        badge: "border-[#F59E0B]/20 bg-[#F59E0B]/10 text-[#F59E0B]",
        bar: "bg-[#F59E0B]",
      },
    };
  }

  if (completed === 3) {
    return {
      label: "Medium",
      width: 60,
      toneClass: {
        badge: "border-[#EAB308]/20 bg-[#EAB308]/10 text-[#EAB308]",
        bar: "bg-[#EAB308]",
      },
    };
  }

  if (completed === 4) {
    return {
      label: "Strong",
      width: 80,
      toneClass: {
        badge: "border-[#3B82F6]/20 bg-[#3B82F6]/10 text-[#3B82F6]",
        bar: "bg-[#3B82F6]",
      },
    };
  }

  return {
    label: "Very Strong",
    width: 100,
    toneClass: {
      badge: "border-[#22C55E]/20 bg-[#22C55E]/10 text-[#22C55E]",
      bar: "bg-[#22C55E]",
    },
  };
}
