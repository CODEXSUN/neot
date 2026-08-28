"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "../../../components/command";

export type GlobalSearchItem = {
  group: string;
  keywords?: string[];
  title: string;
  url: string;
};

export function GlobalSearch({
  items,
  placeholder = "Search NEOT"
}: {
  items: GlobalSearchItem[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupItems(items), [items]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <>
      <button
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Open global search"
        className="flex h-10 w-full items-center gap-3 rounded-full border border-transparent bg-muted/80 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={() => setOpen(true)}
        type="button"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">{placeholder}</span>
        <kbd className="ml-auto hidden rounded border bg-background/80 px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground shadow-sm sm:inline-flex">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput autoFocus placeholder={placeholder} />
        <CommandList className="max-h-[min(60vh,28rem)] py-2">
          <CommandEmpty>No matching workspace or page.</CommandEmpty>
          {groups.map(([group, entries]) => (
            <CommandGroup heading={group} key={group}>
              {entries.map((item) => (
                <CommandItem
                  key={`${item.group}-${item.title}-${item.url}`}
                  onSelect={() => {
                    setOpen(false);
                    window.location.assign(item.url);
                  }}
                  value={[item.title, item.group, ...(item.keywords ?? [])].join(" ")}
                >
                  <SearchIcon className="text-muted-foreground" />
                  <span>{item.title}</span>
                  <CommandShortcut>{item.group}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function groupItems(items: GlobalSearchItem[]) {
  const groups = new Map<string, GlobalSearchItem[]>();
  for (const item of items) {
    const entries = groups.get(item.group) ?? [];
    entries.push(item);
    groups.set(item.group, entries);
  }
  return [...groups.entries()];
}
