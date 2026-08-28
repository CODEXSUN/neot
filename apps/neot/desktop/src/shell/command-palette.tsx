import { Command, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  run: () => void;
};

export function CommandPalette({
  commands,
  onClose
}: {
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value
      ? commands.filter((command) =>
          `${command.label} ${command.detail}`.toLowerCase().includes(value)
        )
      : commands;
  }, [commands, query]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && results[0]) {
        event.preventDefault();
        results[0].run();
        onClose();
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [onClose, results]);

  return (
    <div className="palette-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-label="Command palette"
        aria-modal="true"
        className="command-palette"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <Search size={16} />
          <input
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands and files"
            value={query}
          />
          <button aria-label="Close command palette" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </header>
        <div className="palette-results">
          {results.map((command) => (
            <button
              key={command.id}
              onClick={() => {
                command.run();
                onClose();
              }}
              type="button"
            >
              <Command size={14} />
              <span>
                <strong>{command.label}</strong>
                <small>{command.detail}</small>
              </span>
            </button>
          ))}
          {!results.length ? <p>No matching command</p> : null}
        </div>
        <footer>
          <span>Enter to run</span>
          <span>Esc to close</span>
        </footer>
      </section>
    </div>
  );
}
