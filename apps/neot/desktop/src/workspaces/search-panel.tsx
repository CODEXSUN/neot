import { Search } from "lucide-react";
import { useState } from "react";
import type { SearchMatch } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function SearchPanel({ onOpen }: { onOpen: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    setSearching(true);
    try {
      setMatches(await desktopClient.searchWorkspace(query));
    } finally {
      setSearching(false);
    }
  }
  return (
    <div className="search-panel">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <input
          aria-label="Search workspace"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace"
          value={query}
        />
        <button disabled={query.trim().length < 2 || searching} type="submit">
          <Search size={14} />
        </button>
      </form>
      <small>{searching ? "Searching…" : `${matches.length} results`}</small>
      <div className="search-results">
        {matches.map((match) => (
          <button
            key={`${match.path}:${match.line}`}
            onClick={() => onOpen(match.path)}
            type="button"
          >
            <strong>{match.path}</strong>
            <span>
              Line {match.line} · {match.preview}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
