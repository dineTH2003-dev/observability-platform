import {
  BadgeCheck,
  CalendarDays,
  Mail,
} from "lucide-react";

import { AvatarUploader } from "./AvatarUploader";
import { Card, CardContent } from "../ui/card";
import type { ProfileFormValues, UserProfile } from "../../types/user";

interface ProfileCardProps {
  avatarUrl?: string;
  formValues: ProfileFormValues;
  isEditing: boolean;
  profile: UserProfile | null;
  onAvatarChange: (file: File) => void;
  onAvatarRemove: () => void;
}

function formatJoinedDate(createdAt?: string) {
  if (!createdAt) return "N/A";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(createdAt));
}

function roleLabel(role?: string) {
  return role?.trim() || "Member";
}

export function ProfileCard({
  avatarUrl,
  formValues,
  isEditing,
  profile,
  onAvatarChange,
  onAvatarRemove,
}: ProfileCardProps) {
  const fullName = `${formValues.firstName} ${formValues.lastName}`.trim() || "CloudSight User";

  return (
    <Card className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(17,25,61,0.98),rgba(9,14,39,0.96))] shadow-[0_24px_80px_rgba(3,8,28,0.45)]">
      <CardContent className="p-6">
        <div className="flex h-full flex-col">
          <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.16),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5">
            <AvatarUploader
              avatarUrl={avatarUrl}
              disabled={!isEditing}
              onAvatarChange={onAvatarChange}
              onAvatarRemove={onAvatarRemove}
            />

            <div className="mt-5 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-white">{fullName}</h2>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-nebula-blue/20 bg-nebula-blue/10 px-3 py-1 text-xs font-medium text-nebula-blue-light">
                  {roleLabel(formValues.role)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <BadgeCheck className="size-3.5" />
                  Active
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <MetaRow icon={Mail} label="Email" value={formValues.email || "No email set"} />
              <MetaRow
                icon={CalendarDays}
                label="Member Since"
                value={formatJoinedDate(profile?.createdAt)}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {isEditing ? (
              <p className="rounded-2xl border border-nebula-blue/20 bg-nebula-blue/10 px-4 py-3 text-sm text-slate-200">
                Avatar changes are previewed immediately and saved together with your profile updates.
              </p>
            ) : (
              <p className="rounded-2xl border border-white/8 bg-nebula-navy-dark/80 px-4 py-3 text-sm text-slate-400">
                Use Edit Profile to update account details. Avatar management appears here when edit mode is enabled.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/6 bg-nebula-navy-dark/70 px-3 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-nebula-cyan">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}
