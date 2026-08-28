import * as React from "react";

import { cn } from "../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (
    { className, defaultValue, inputMode, onBlur, onChange, onFocus, type, value, ...props },
    ref
  ) => {
    const numeric = type === "number" || inputMode === "decimal" || inputMode === "numeric";
    const [numericDraft, setNumericDraft] = React.useState(() =>
      numeric ? inputValue(value ?? defaultValue) : ""
    );
    const focused = React.useRef(false);

    React.useEffect(() => {
      if (numeric && !focused.current) {
        setNumericDraft(inputValue(value ?? defaultValue));
      }
    }, [defaultValue, numeric, value]);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      if (numeric) focused.current = true;
      onFocus?.(event);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (numeric) setNumericDraft(event.target.value);
      onChange?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      if (numeric) {
        focused.current = false;
        setNumericDraft(normalizeNumericDraft(event.target.value));
      }
      onBlur?.(event);
    };

    return (
      <input
        type={numeric ? "text" : type}
        inputMode={numeric ? "decimal" : inputMode}
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-white px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...(numeric
          ? { value: numericDraft }
          : {
              ...(defaultValue !== undefined ? { defaultValue } : {}),
              ...(value !== undefined ? { value } : {})
            })}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

function inputValue(value: React.ComponentProps<"input">["value"]) {
  return value == null ? "" : String(value);
}

function normalizeNumericDraft(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : trimmed;
}

export { Input };
