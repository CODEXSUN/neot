export type MascotStatusPlacement = "above" | "left" | "right";

export function MascotStatus({
  dismissed,
  label,
  listening,
  message,
  onDismiss,
  placement,
  visible
}: {
  dismissed: boolean;
  label: string;
  listening: boolean;
  message: string;
  onDismiss: () => void;
  placement: MascotStatusPlacement;
  visible: boolean;
}) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none absolute w-56 transition duration-300 ${dismissed ? "" : "group-hover:opacity-100 group-focus-visible:opacity-100"} ${placementClass[placement]} ${visible && !dismissed ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
    >
      <div className="relative rounded-[1.5rem] border border-amber-200/70 bg-[#fffaf0]/95 px-5 py-3 pr-10 text-sm leading-tight text-stone-900 shadow-[0_12px_28px_rgba(120,88,24,0.18)] backdrop-blur dark:border-amber-200/15 dark:bg-[#272219]/95 dark:text-amber-50">
        <button
          aria-label="Close Honey message"
          className="pointer-events-auto absolute right-2.5 top-2.5 z-10 flex size-7 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-lg font-medium leading-none text-amber-900 shadow-sm transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-200/25 dark:bg-amber-100/15 dark:text-amber-50 dark:hover:bg-amber-100/25"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="font-semibold">Hi, I&apos;m {label}</div>
        <div className="pt-1 text-stone-500 dark:text-amber-100/65">
          {message || (listening ? "Listening…" : "Waiting to help you")}
        </div>
      </div>
    </div>
  );
}

const placementClass: Record<MascotStatusPlacement, string> = {
  above: "bottom-full left-1/2 -translate-x-1/2 pb-3 origin-bottom",
  left: "right-full top-1/2 -translate-y-1/2 pr-3 origin-right",
  right: "left-full top-1/2 -translate-y-1/2 pl-3 origin-left"
};
