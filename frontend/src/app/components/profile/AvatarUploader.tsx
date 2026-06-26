import { useRef } from "react";
import { Camera, ImagePlus, Trash2, User } from "lucide-react";

import { Button } from "../ui/button";

interface AvatarUploaderProps {
  avatarUrl?: string;
  disabled: boolean;
  onAvatarChange: (file: File) => void;
  onAvatarRemove: () => void;
}

export function AvatarUploader({
  avatarUrl,
  disabled,
  onAvatarChange,
  onAvatarRemove,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32 overflow-hidden rounded-full border border-white/12 bg-nebula-navy-dark shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-nebula-blue/25 via-nebula-purple/25 to-nebula-pink/20">
            <User className="size-12 text-slate-300" />
          </div>
        )}
        {!disabled && (
          <>
            <div className="absolute inset-0 bg-black/0 transition duration-200 hover:bg-black/30" />
            <button
              type="button"
              aria-label="Change avatar"
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center text-white opacity-0 transition duration-200 hover:opacity-100 focus:opacity-100"
            >
              <span className="rounded-full border border-white/10 bg-black/40 p-3 backdrop-blur-sm">
                <Camera className="size-5" />
              </span>
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onAvatarChange(file);
          }
          event.currentTarget.value = "";
        }}
      />

      {!disabled && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/8"
          >
            <ImagePlus className="mr-2 size-4" />
            {avatarUrl ? "Replace" : "Upload"}
          </Button>

          {avatarUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={onAvatarRemove}
              className="h-10 rounded-xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <Trash2 className="mr-2 size-4" />
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
