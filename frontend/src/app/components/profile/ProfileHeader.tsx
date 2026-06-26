import { ShieldCheck, Globe } from "lucide-react";

interface ProfileHeaderProps {
  timezone: string;
}

export function ProfileHeader({
  timezone,
}: ProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(135deg,rgba(124,58,237,0.18),rgba(59,130,246,0.12)_42%,rgba(17,25,61,0.95)_72%)] p-6 shadow-[0_24px_80px_rgba(3,8,28,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(124,58,237,0.18),transparent_24%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-nebula-cyan">
              <ShieldCheck className="size-3.5" />
              Account Center
            </div>
            {timezone && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Globe className="size-3 text-nebula-cyan" />
                {timezone}
              </div>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Profile Settings
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Manage your CloudSight identity, security, and account controls from a single
            workspace designed for day-to-day operations.
          </p>
        </div>
      </div>
    </div>
  );
}
