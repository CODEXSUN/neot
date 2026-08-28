import { AnimatePresence, motion } from "framer-motion";
import {
  BotIcon,
  FolderKanbanIcon,
  LayoutGridIcon,
  LightbulbIcon,
  ListTodoIcon,
  type LucideIcon
} from "lucide-react";
import { useState } from "react";

type DockItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const items: DockItem[] = [
  {
    href: "/app/neot/classes",
    icon: FolderKanbanIcon,
    label: "Classes"
  },
  { href: "/app/neot/ideas", icon: LightbulbIcon, label: "Ideas" },
  { href: "/app/neot/tasks", icon: ListTodoIcon, label: "Todos" },
  { href: "/app/neot/agent-ide", icon: BotIcon, label: "Project Agent" },
  { href: "/app/neot/apps", icon: LayoutGridIcon, label: "App Desk" }
];

const spring = { damping: 15, mass: 0.18, stiffness: 220 };

export function DashboardDock() {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <nav
      aria-label="Dashboard shortcuts"
      className="flex h-[92px] items-end gap-1.5 rounded-3xl bg-card/95 px-3 pb-3 shadow-sm backdrop-blur sm:gap-8 sm:px-8"
      onMouseLeave={() => setFocusedIndex(null)}
    >
      {items.map((item, index) => (
        <DockLink
          focusedIndex={focusedIndex}
          index={index}
          item={item}
          key={item.href}
          onFocusChange={setFocusedIndex}
        />
      ))}
    </nav>
  );
}

function DockLink({
  focusedIndex,
  index,
  item,
  onFocusChange
}: {
  focusedIndex: number | null;
  index: number;
  item: DockItem;
  onFocusChange(index: number | null): void;
}) {
  const distance =
    focusedIndex === null ? Number.POSITIVE_INFINITY : Math.abs(focusedIndex - index);
  const active = distance === 0;
  const adjacent = distance === 1;
  const Icon = item.icon;

  return (
    <motion.a
      animate={{ scale: active ? 1.24 : adjacent ? 1.08 : 1, y: active ? -16 : adjacent ? -6 : 0 }}
      aria-label={item.label}
      className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:size-16"
      href={item.href}
      onBlur={() => onFocusChange(null)}
      onFocus={() => onFocusChange(index)}
      onMouseEnter={() => onFocusChange(index)}
      transition={spring}
    >
      <Icon className="size-5 sm:size-7" />
      <AnimatePresence>
        {active ? (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2.5 py-1.5 text-sm font-medium text-foreground"
            exit={{ opacity: 0, y: 3 }}
            initial={{ opacity: 0, y: 3 }}
          >
            {item.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.a>
  );
}
