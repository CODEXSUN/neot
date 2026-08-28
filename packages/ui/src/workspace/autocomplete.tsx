"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "../components/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/popover";
import { cn } from "../lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
}

export function WorkspaceAutocomplete({
  className,
  createLabel,
  emptyLabel = "No results found.",
  loading,
  onChange,
  onCreate,
  options,
  placeholder = "",
  value
}: {
  className?: string;
  createLabel?: string;
  emptyLabel?: string;
  loading?: boolean;
  onChange: (value: string | null, option?: AutocompleteOption) => void;
  onCreate?: (query: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-between rounded-md border-input bg-white px-3 text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[120] w-[var(--radix-popover-trigger-width)] rounded-md p-0 shadow-xl"
      >
        <Command>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{loading ? "Searching..." : emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    const opt = options.find((o) => o.value === currentValue);
                    onChange(currentValue, opt);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {createLabel && query.trim() ? (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreate?.(query.trim());
                    setOpen(false);
                  }}
                >
                  <Search className="mr-2 size-4" />
                  {createLabel}: "{query.trim()}"
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
