"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { Button } from "../components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../components/dialog";
import { Input } from "../components/input";
import { Label } from "../components/label";
import { cn } from "../lib/utils";

export interface WorkspaceLookupOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}

export type WorkspaceLookupCreateMode = "none" | "inline" | "popup";

export function WorkspaceLookup({
  allowTextValue = true,
  className,
  clearable = true,
  compactOptions = false,
  createDescription,
  createDialogClassName,
  createLabel,
  createMode = "none",
  createTitle,
  disabled = false,
  dropdownClassName,
  dropdownMode = "portal",
  dropdownMinWidth = 260,
  dropdownPlacement = "bottom",
  emptyLabel = "No matches found.",
  loading = false,
  invalid = false,
  onCreate,
  onTextChange,
  onValueChange,
  options,
  placeholder = "",
  sanitizeInput,
  showDropdownIcon = true,
  showAllOptionsOnFocus = false,
  showSearchIcon = true,
  renderCreateForm,
  required = false,
  trailingAction,
  value
}: {
  allowTextValue?: boolean | undefined;
  className?: string | undefined;
  clearable?: boolean | undefined;
  compactOptions?: boolean | undefined;
  createDescription?: string | undefined;
  createDialogClassName?: string | undefined;
  createLabel?: string | undefined;
  createMode?: WorkspaceLookupCreateMode | undefined;
  createTitle?: string | undefined;
  disabled?: boolean;
  dropdownClassName?: string | undefined;
  dropdownMode?: "inline" | "portal" | undefined;
  dropdownMinWidth?: number | undefined;
  dropdownPlacement?: "bottom" | "top" | undefined;
  emptyLabel?: string;
  loading?: boolean;
  invalid?: boolean;
  onCreate?:
    | ((
        name: string
      ) =>
        WorkspaceLookupOption | Promise<WorkspaceLookupOption | undefined> | void | Promise<void>)
    | undefined;
  onTextChange?: ((value: string) => void) | undefined;
  onValueChange: (value: string, option?: WorkspaceLookupOption | null) => void;
  options: WorkspaceLookupOption[];
  placeholder?: string;
  sanitizeInput?: ((value: string) => string) | undefined;
  showDropdownIcon?: boolean | undefined;
  showAllOptionsOnFocus?: boolean | undefined;
  showSearchIcon?: boolean | undefined;
  required?: boolean;
  trailingAction?: ReactNode | undefined;
  renderCreateForm?:
    | ((context: {
        initialName: string;
        onCancel: () => void;
        onCreated: (option: WorkspaceLookupOption) => void;
      }) => ReactNode)
    | undefined;
  value: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [createdOptions, setCreatedOptions] = useState<WorkspaceLookupOption[]>([]);
  const [createQuery, setCreateQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDisplayValue, setSelectedDisplayValue] = useState("");
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [selectedFallbackOption, setSelectedFallbackOption] =
    useState<WorkspaceLookupOption | null>(null);
  const [query, setQuery] = useState("");
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const preserveCreateQueryRef = useRef(false);
  const allOptions = useMemo(
    () => mergeOptions(options, createdOptions),
    [createdOptions, options]
  );
  const selectedOption = useMemo(
    () =>
      findOption(allOptions, value) ??
      (selectedFallbackOption?.value === value ? selectedFallbackOption : undefined),
    [allOptions, selectedFallbackOption, value]
  );
  const normalizedQuery = (showAllOptions ? "" : query).trim().toLowerCase();
  const filteredOptions = useMemo(
    () =>
      allOptions.filter((option) =>
        [option.label, option.value, option.description, option.meta]
          .filter(Boolean)
          .some((part) => String(part).toLowerCase().includes(normalizedQuery))
      ),
    [allOptions, normalizedQuery]
  );
  const exactOption = useMemo(
    () => allOptions.find((option) => isExactMatch(option, normalizedQuery)),
    [allOptions, normalizedQuery]
  );
  const canCreate = Boolean(
    createMode !== "none" && query.trim() && !exactOption && !disabled && !loading && !isCreating
  );
  const optionCount = filteredOptions.length + (canCreate ? 1 : 0);

  useEffect(() => {
    if (value) return;
    setQuery("");
    setSelectedDisplayValue("");
    setSelectedFallbackOption(null);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      const nextQuery = value ? (selectedOption?.label ?? selectedDisplayValue ?? value) : "";
      setQuery((current) => (current === nextQuery ? current : nextQuery));
    }
  }, [allowTextValue, isOpen, selectedDisplayValue, selectedOption, value]);

  useEffect(() => {
    if (!isOpen) return;
    const activeOption = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function updateListPosition() {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;

      const preferredHeight = 260;
      const viewportPadding = 16;
      const belowTop = rect.bottom + 8;
      const belowSpace = window.innerHeight - belowTop - viewportPadding;
      const aboveTop = Math.max(viewportPadding, rect.top - preferredHeight - 8);
      const top = belowSpace >= 120 ? belowTop : aboveTop;
      const maxHeight = Math.min(
        preferredHeight,
        Math.max(112, window.innerHeight - top - viewportPadding)
      );

      setListStyle({
        left: rect.left,
        maxHeight,
        top,
        width: Math.max(rect.width, dropdownMinWidth)
      });
    }

    updateListPosition();
    window.addEventListener("resize", updateListPosition);
    window.addEventListener("scroll", updateListPosition, true);
    return () => {
      window.removeEventListener("resize", updateListPosition);
      window.removeEventListener("scroll", updateListPosition, true);
    };
  }, [dropdownMinWidth, isOpen]);

  function selectOption(option: WorkspaceLookupOption) {
    setShowAllOptions(false);
    const normalizedOption = normalizeOption(option);
    setSelectedFallbackOption(normalizedOption);
    setSelectedDisplayValue(normalizedOption.label);
    setQuery(normalizedOption.label);
    onValueChange(normalizedOption.value, normalizedOption);
    setIsOpen(false);
  }

  function resetQuery() {
    setQuery(selectedOption?.label ?? selectedDisplayValue ?? value);
  }

  function clearSelection() {
    setQuery("");
    setSelectedDisplayValue("");
    setSelectedFallbackOption(null);
    setActiveIndex(0);
    setIsOpen(true);
    onTextChange?.("");
    onValueChange("", null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function createOption(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) return null;
    setIsCreating(true);
    try {
      const createdResult = await onCreate?.(normalizedName);
      const created = createdResult ?? {
        label: normalizedName,
        value: normalizeLookupValue(normalizedName)
      };
      setCreatedOptions((current) => mergeOptions(current, [created]));
      selectOption(created);
      return created;
    } finally {
      setIsCreating(false);
    }
  }

  function handleCreate() {
    const name = query.trim();
    if (!name || exactOption) return;
    setCreateQuery(name);
    preserveCreateQueryRef.current = true;
    if (createMode === "popup") {
      setIsCreateOpen(true);
      setIsOpen(false);
      return;
    }
    void createOption(name);
  }

  return (
    <>
      <div className={cn("relative z-10 w-full focus-within:z-[90]", className)}>
        <div className="relative">
          {showSearchIcon ? (
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          ) : null}
          <Input
            ref={inputRef}
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-invalid={invalid}
            className={cn(
              "h-11 w-full rounded-md bg-white pl-9 pr-9 shadow-sm hover:bg-white focus-visible:bg-white",
              !showSearchIcon && "pl-3",
              !showDropdownIcon && (!clearable || !value) && "pr-3",
              invalid && "border-destructive focus-visible:ring-destructive/30"
            )}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            role="combobox"
            value={query}
            onBlur={() => {
              setShowAllOptions(false);
              if (exactOption) {
                selectOption(exactOption);
                return;
              }
              window.setTimeout(() => {
                setIsOpen(false);
                if (preserveCreateQueryRef.current) return;
                if (!allowTextValue) resetQuery();
              }, 120);
            }}
            onChange={(event) => {
              const nextQuery = sanitizeInput
                ? sanitizeInput(event.target.value)
                : event.target.value;
              const matchingOption = allOptions.find((option) =>
                isExactMatch(option, nextQuery.trim().toLowerCase())
              );
              setQuery(nextQuery);
              setShowAllOptions(false);
              setSelectedDisplayValue("");
              setIsOpen(true);
              setActiveIndex(0);
              onTextChange?.(nextQuery);
              if (allowTextValue)
                onValueChange(matchingOption?.value ?? nextQuery, matchingOption ?? null);
            }}
            onFocus={() => {
              setIsOpen(true);
              setShowAllOptions(showAllOptionsOnFocus);
              if (showAllOptionsOnFocus) {
                const selectedIndex = allOptions.findIndex((option) => option.value === value);
                setActiveIndex(Math.max(0, selectedIndex));
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsOpen(true);
                setActiveIndex((current) => (optionCount ? (current + 1) % optionCount : 0));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setIsOpen(true);
                setActiveIndex((current) =>
                  optionCount ? (current - 1 + optionCount) % optionCount : 0
                );
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const activeOption = filteredOptions[activeIndex];
                if (activeOption) selectOption(activeOption);
                else if (canCreate && activeIndex === filteredOptions.length) handleCreate();
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                resetQuery();
              }
            }}
          />
          {value && clearable ? (
            <button
              aria-label="Clear selection"
              className="absolute right-8 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearSelection}
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          {trailingAction ??
            (showDropdownIcon ? (
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            ) : null)}
        </div>
        {isOpen && dropdownMode === "inline" ? (
          <LookupList
            ref={listRef}
            activeIndex={activeIndex}
            canCreate={canCreate}
            createLabel={createLabel}
            compactOptions={compactOptions}
            dropdownPlacement={dropdownPlacement}
            className={dropdownClassName}
            emptyLabel={emptyLabel}
            filteredOptions={filteredOptions}
            isCreating={isCreating}
            loading={loading}
            query={query}
            value={value}
            onCreate={handleCreate}
            onSelect={selectOption}
          />
        ) : null}
        {isOpen && dropdownMode === "portal" && listStyle && typeof document !== "undefined"
          ? createPortal(
              <LookupList
                ref={listRef}
                activeIndex={activeIndex}
                canCreate={canCreate}
                createLabel={createLabel}
                compactOptions={compactOptions}
                dropdownPlacement="bottom"
                className={dropdownClassName}
                emptyLabel={emptyLabel}
                filteredOptions={filteredOptions}
                isCreating={isCreating}
                loading={loading}
                query={query}
                style={listStyle}
                value={value}
                onCreate={handleCreate}
                onSelect={selectOption}
              />,
              document.body
            )
          : null}
      </div>
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent
          className={cn("rounded-md p-0 sm:max-w-3xl", createDialogClassName)}
          onInteractOutside={(event) => event.preventDefault()}
        >
          {renderCreateForm ? (
            renderCreateForm({
              initialName: createQuery,
              onCancel: () => {
                preserveCreateQueryRef.current = false;
                setIsCreateOpen(false);
                resetQuery();
              },
              onCreated: (option) => {
                setCreatedOptions((current) => mergeOptions(current, [option]));
                selectOption(option);
                setIsCreateOpen(false);
                window.setTimeout(() => {
                  preserveCreateQueryRef.current = false;
                }, 180);
              }
            })
          ) : (
            <DefaultCreateForm
              description={createDescription}
              initialName={createQuery}
              label={createLabel ?? "Create"}
              title={createTitle ?? createLabel ?? "Create lookup record"}
              onCancel={() => {
                preserveCreateQueryRef.current = false;
                setIsCreateOpen(false);
                resetQuery();
              }}
              onSubmit={(name) => {
                void createOption(name);
                setIsCreateOpen(false);
                window.setTimeout(() => {
                  preserveCreateQueryRef.current = false;
                }, 180);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const LookupList = forwardRef<
  HTMLDivElement,
  {
    activeIndex: number;
    canCreate: boolean;
    className?: string | undefined;
    compactOptions: boolean;
    createLabel?: string | undefined;
    dropdownPlacement: "bottom" | "top";
    emptyLabel: string;
    filteredOptions: WorkspaceLookupOption[];
    isCreating: boolean;
    loading: boolean;
    query: string;
    style?: CSSProperties | undefined;
    value: string;
    onCreate: () => void;
    onSelect: (option: WorkspaceLookupOption) => void;
  }
>(
  (
    {
      activeIndex,
      canCreate,
      className,
      compactOptions,
      createLabel,
      dropdownPlacement,
      emptyLabel,
      filteredOptions,
      isCreating,
      loading,
      onCreate,
      onSelect,
      query,
      style,
      value
    },
    ref
  ) => (
    <div
      ref={ref}
      role="listbox"
      style={style}
      className={cn(
        "z-[10000] max-h-64 overflow-y-auto overscroll-contain rounded-md border border-border bg-card p-1 shadow-2xl ring-1 ring-black/5 pointer-events-auto [scrollbar-color:hsl(var(--muted-foreground)/0.42)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-track]:bg-transparent",
        style
          ? "fixed"
          : dropdownPlacement === "top"
            ? "absolute bottom-[calc(100%+0.25rem)] left-0 right-0"
            : "absolute left-0 right-0 top-[calc(100%+0.25rem)]",
        className
      )}
      onMouseDown={(event) => event.preventDefault()}
    >
      {loading ? <LookupLoadingRows /> : null}
      {!loading && filteredOptions.length === 0 && !canCreate && !isCreating ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
      ) : null}
      {filteredOptions.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={`${option.value}-${index}`}
            aria-selected={isSelected}
            data-active={activeIndex === index}
            role="option"
            type="button"
            className={cn(
              "grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors",
              compactOptions && "gap-1 px-2",
              activeIndex === index ? "bg-accent/80" : "bg-card hover:bg-accent/60"
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(option);
            }}
          >
            <span
              className={cn(
                "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]",
                compactOptions && "whitespace-nowrap break-normal [overflow-wrap:normal]"
              )}
            >
              <span
                className={cn(
                  "block whitespace-normal break-words font-medium [overflow-wrap:anywhere]",
                  compactOptions && "whitespace-nowrap break-normal [overflow-wrap:normal]"
                )}
              >
                {option.label}
              </span>
              {option.description || option.meta ? (
                <span className="block whitespace-normal break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {[option.description, option.meta].filter(Boolean).join(" | ")}
                </span>
              ) : null}
            </span>
            {isSelected ? (
              <Check className="size-4 shrink-0 text-primary" strokeWidth={3} />
            ) : (
              <span className="size-4 shrink-0" />
            )}
          </button>
        );
      })}
      {canCreate || isCreating ? (
        <button
          data-active={activeIndex === filteredOptions.length}
          type="button"
          disabled={isCreating}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-primary transition-colors",
            activeIndex === filteredOptions.length ? "bg-accent/80" : "hover:bg-accent/60"
          )}
          onMouseDown={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <Plus className="size-4" />
          {isCreating ? "Creating..." : `${createLabel ?? "Create"} "${query.trim()}"`}
        </button>
      ) : null}
    </div>
  )
);
LookupList.displayName = "LookupList";

function DefaultCreateForm({
  description,
  initialName,
  label,
  onCancel,
  onSubmit,
  title
}: {
  description?: string | undefined;
  initialName: string;
  label: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
  title: string;
}) {
  const [name, setName] = useState(initialName);

  return (
    <form
      className="grid gap-0"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit(name);
      }}
    >
      <DialogHeader className="border-b border-border/80 px-5 py-4 pr-12">
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      <div className="grid gap-2 px-5 py-5">
        <Label>Name</Label>
        <Input
          autoFocus
          className="h-11 rounded-md"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <DialogFooter className="border-t border-border/80 px-5 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="size-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          <Plus className="size-4" />
          {label}
        </Button>
      </DialogFooter>
    </form>
  );
}

function LookupLoadingRows() {
  return (
    <div className="px-3 py-4 text-sm text-muted-foreground" role="status">
      Loading options...
    </div>
  );
}

function mergeOptions(base: WorkspaceLookupOption[], additions: WorkspaceLookupOption[]) {
  const map = new Map<string, WorkspaceLookupOption>();
  for (const rawOption of base) {
    const option = normalizeOption(rawOption);
    map.set(option.value, option);
  }
  for (const rawOption of additions) {
    const option = normalizeOption(rawOption);
    map.set(option.value, option);
  }
  return Array.from(map.values());
}

function findOption(options: WorkspaceLookupOption[], value: string) {
  const normalizedValue = String(value).trim().toLowerCase();
  return options.find(
    (option) =>
      String(option.value).toLowerCase() === normalizedValue ||
      String(option.label).toLowerCase() === normalizedValue
  );
}

function isExactMatch(option: WorkspaceLookupOption, normalizedQuery: string) {
  return (
    String(option.value).toLowerCase() === normalizedQuery ||
    String(option.label).toLowerCase() === normalizedQuery
  );
}

function normalizeOption(option: WorkspaceLookupOption): WorkspaceLookupOption {
  return {
    ...option,
    label: String(option.label ?? ""),
    value: String(option.value ?? "")
  };
}

function normalizeLookupValue(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
