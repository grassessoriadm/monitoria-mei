import { statusLabel, statusTone, type Tone } from "@/lib/mei/constants";
import { cn } from "@/lib/utils";

const toneClasses: Record<Tone, string> = {
  green: "bg-ok-soft text-ok-strong",
  yellow: "bg-warn-soft text-warn-strong",
  red: "bg-bad-soft text-bad-strong",
  neutral: "bg-muted text-muted-foreground",
};

const dotClasses: Record<Tone, string> = {
  green: "bg-ok",
  yellow: "bg-warn",
  red: "bg-bad",
  neutral: "bg-muted-foreground/50",
};

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string | undefined }) {
  return (
    <Pill tone={statusTone(status)} className={className}>
      {statusLabel(status)}
    </Pill>
  );
}