import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

export function ResultBadge({ result, className }: { result?: string; className?: string }) {
  const isMatch = result === "Match" || result === "match" || result === true?.toString();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        isMatch
          ? "bg-success/15 text-success ring-1 ring-success/30"
          : "bg-destructive/15 text-destructive ring-1 ring-destructive/30",
        className,
      )}
    >
      {isMatch ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {isMatch ? "Match" : "No Match"}
    </span>
  );
}
