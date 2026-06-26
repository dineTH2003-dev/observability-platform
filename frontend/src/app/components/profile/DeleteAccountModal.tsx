import { useEffect, useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface DeleteAccountModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  isOpen,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteAccountModalProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const canDelete = confirmationText === "DELETE";

  useEffect(() => {
    if (!isOpen) {
      setConfirmationText("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="border-white/8 bg-nebula-navy-dark text-white sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <ShieldAlert className="size-5" />
          </div>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you absolutely sure? Deleting your account permanently removes all your data.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-slate-200">
            Type <span className="font-semibold tracking-[0.18em] text-white">DELETE</span> to continue.
          </div>

          <div className="space-y-2">
            <Input
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canDelete && !isDeleting) {
                  event.preventDefault();
                  onConfirm();
                }
              }}
              aria-label="Type DELETE to confirm account deletion"
              placeholder="Type DELETE to continue"
              className="h-12 rounded-2xl border-white/8 bg-[#0A1238] text-white placeholder:text-slate-500 focus-visible:ring-red-500/20"
            />
            <p className="text-xs text-slate-500">
              Deletion remains disabled until the exact word is entered.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            className="border-white/10 bg-transparent text-white hover:bg-nebula-navy-light"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting || !canDelete}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            <Trash2 className="mr-2 size-4" />
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
