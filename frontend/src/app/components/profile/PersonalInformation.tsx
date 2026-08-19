import { useEffect, useRef } from "react";
import {
  FileText,
  Mail,
  Phone,
  UserRound,
  Edit3,
  X,
  Save,
  Loader2,
} from "lucide-react";

import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { ProfileInput } from "./ProfileInput";
import { ProfileSelect } from "./ProfileSelect";
import type { ProfileFormValues } from "../../types/user";

const ROLE_OPTIONS = [
  { label: "Admin", value: "Admin" },
  { label: "Engineer", value: "Engineer" },
];

interface PersonalInformationProps {
  disabled: boolean;
  errors: Partial<Record<keyof ProfileFormValues, string>>;
  timezone: string;
  values: ProfileFormValues;
  onChange: (field: keyof ProfileFormValues, value: string) => void;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function PersonalInformation({
  disabled,
  errors,
  values,
  onChange,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: PersonalInformationProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [values.bio]);

  return (
    <Card className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(17,25,61,0.98),rgba(9,14,39,0.96))] shadow-[0_24px_80px_rgba(3,8,28,0.42)]">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-nebula-cyan">
              <UserRound className="size-3.5" />
              Personal Information
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Identity & Contact Details
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Manage your account details and contact information.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={onCancel}
                  className="h-11 rounded-xl border-white/10 bg-transparent px-5 text-slate-300 hover:bg-white/5 transition duration-200"
                >
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={disabled || isSaving}
                  onClick={onSave}
                  className="h-11 rounded-xl bg-gradient-to-r from-nebula-purple to-nebula-blue px-5 text-white shadow-lg shadow-nebula-purple/20 hover:from-nebula-purple-dark hover:to-nebula-blue transition duration-200"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={onEdit}
                className="h-11 rounded-xl bg-gradient-to-r from-nebula-purple to-nebula-blue px-5 text-white shadow-lg shadow-nebula-purple/20 hover:from-nebula-purple-dark hover:to-nebula-blue transition duration-200"
              >
                <Edit3 className="mr-2 size-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Column 1 */}
            <div className="flex flex-col gap-5">
              <ProfileInput
                disabled={disabled}
                error={errors.firstName}
                icon={UserRound}
                label="First Name"
                placeholder="Enter first name"
                value={values.firstName}
                onChange={(value) => onChange("firstName", value)}
              />
              <ProfileInput
                disabled={disabled}
                error={errors.email}
                icon={Mail}
                label="Email"
                placeholder="Enter email address"
                type="email"
                value={values.email}
                onChange={(value) => onChange("email", value)}
              />
              <ProfileSelect
                disabled={disabled}
                error={errors.role}
                icon={UserRound}
                label="Role"
                options={ROLE_OPTIONS}
                value={normalizeRole(values.role)}
                onChange={(value) => onChange("role", value)}
              />
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-5">
              <ProfileInput
                disabled={disabled}
                error={errors.lastName}
                icon={UserRound}
                label="Last Name"
                placeholder="Enter last name"
                value={values.lastName}
                onChange={(value) => onChange("lastName", value)}
              />
              <ProfileInput
                disabled={disabled}
                error={errors.phone}
                icon={Phone}
                label="Phone Number"
                placeholder="Enter phone number"
                value={values.phone}
                onChange={(value) => onChange("phone", value)}
              />
            </div>
          </div>

          {/* Bio Area (full width) */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium text-white">Bio</Label>
            <div className="group relative flex items-start">
              <div className="pointer-events-none absolute left-3.5 top-3.5 z-10 flex items-center justify-center text-slate-500 transition-colors group-focus-within:text-nebula-cyan">
                <FileText className="size-4" />
              </div>
              <Textarea
                ref={textareaRef}
                disabled={disabled}
                value={values.bio}
                maxLength={300}
                onChange={(event) => onChange("bio", event.target.value)}
                className="min-h-[120px] rounded-xl border-white/8 bg-[#0A1238] pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/20 transition duration-200 hover:border-white/12 focus-visible:ring-nebula-purple/30 disabled:opacity-80 resize-none overflow-hidden"
                placeholder="Tell your team a bit about yourself"
              />
            </div>
            <div className="flex items-center justify-between">
              {errors.bio ? <p className="text-xs text-red-400">{errors.bio}</p> : <div />}
              <p className="text-xs text-slate-500">{values.bio.length}/300</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeRole(role: string) {
  const normalized = role.trim().toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "engineer") return "Engineer";
  return "Engineer";
}
