type StatusTone = "green" | "blue" | "amber" | "red" | "neutral";

const toneClass: Record<StatusTone, string> = {
  amber: "bg-amber-100 text-amber-900",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-emerald-100 text-emerald-800",
  neutral: "bg-muted text-muted-foreground",
  red: "bg-red-100 text-red-800"
};

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: string;
  tone?: StatusTone;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-none ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
