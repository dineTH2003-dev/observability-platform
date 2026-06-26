import { ChevronRight, ShieldAlert, Trash2 } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { WarningCard } from "./WarningCard";

interface DeleteAccountCardProps {
  isDeleting: boolean;
  onDelete: () => void;
}

export function DeleteAccountCard({
  isDeleting,
  onDelete,
}: DeleteAccountCardProps) {
  return (
    <Card className="rounded-[28px] border-white/8 bg-[linear-gradient(180deg,rgba(17,25,61,0.98),rgba(9,14,39,0.96))] shadow-[0_24px_80px_rgba(3,8,28,0.42)]">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-red-300">
                <ShieldAlert className="size-3.5" />
              Danger Zone
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Permanent account actions
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Deleting your account permanently removes your profile, settings, uploaded images,
                personal information, and activity history. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)] xl:items-start">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/6 bg-white/[0.02] p-5">
                <p className="text-sm font-medium text-white">Deleting your account permanently removes</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-3">
                    <ChevronRight className="size-4 text-red-300" />
                    Profile
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="size-4 text-red-300" />
                    Settings
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="size-4 text-red-300" />
                    Uploaded images
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="size-4 text-red-300" />
                    Personal information
                  </li>
                  <li className="flex items-center gap-3">
                    <ChevronRight className="size-4 text-red-300" />
                    Activity history
                  </li>
                </ul>
              </div>

              <WarningCard
                title="Warning"
                message="Your account and all associated data will be permanently deleted. This operation cannot be reversed."
              />
            </div>

            <div className="rounded-[24px] border border-white/6 bg-white/[0.02] p-5">
              <p className="text-sm font-medium text-white">Need help?</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Contact your administrator before deleting your account if you need assistance
                recovering settings or exported data.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-start">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Destructive action
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeleting}
                  onClick={onDelete}
                  className="h-11 w-full rounded-xl border-red-500/40 bg-transparent px-5 text-red-300 transition duration-200 hover:bg-red-600 hover:text-white sm:w-auto"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
