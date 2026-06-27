import { AlertTriangle } from "lucide-react";

interface WarningCardProps {
  message: string;
  title: string;
}

export function WarningCard({ message, title }: WarningCardProps) {
  return (
    <div className="rounded-[24px] border border-red-500/20 bg-[linear-gradient(180deg,rgba(239,68,68,0.12),rgba(127,29,29,0.04))] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
          <AlertTriangle className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-200">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
