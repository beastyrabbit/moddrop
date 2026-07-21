"use client";

import { useQuery } from "convex/react";
import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface UserEntry {
  userId: string;
  username: string;
}

interface UserMultiSelectProps {
  /** Currently selected Clerk user IDs. */
  value: string[];
  /** Called when selection changes — receives Clerk user IDs. */
  onChange: (userIds: string[]) => void;
  /** Optional input id for external labels. */
  inputId?: string;
}

export function UserMultiSelect({
  value,
  onChange,
  inputId,
}: UserMultiSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const listboxId = `${inputId ?? generatedId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useQuery(
    api.users.searchByUsername,
    search.trim().length > 0 ? { prefix: search.trim() } : "skip",
  );

  const resolved = useQuery(
    api.users.resolveUsernames,
    value.length > 0 ? { userIds: value } : "skip",
  );

  const selectedMap = new Map<string, string>();
  if (resolved) {
    for (const user of resolved) {
      selectedMap.set(user.userId, user.username);
    }
  }

  const handleSelect = useCallback(
    (entry: UserEntry) => {
      if (!value.includes(entry.userId)) {
        onChange([...value, entry.userId]);
      }
      setSearch("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange],
  );

  const handleRemove = useCallback(
    (userId: string) => {
      onChange(value.filter((id) => id !== userId));
    },
    [value, onChange],
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredResults =
    results?.filter((user) => !value.includes(user.userId)) ?? [];
  const hasSearch = search.trim().length > 0;
  const showResults = open && hasSearch;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input",
          "bg-background px-2 py-1.5 text-sm",
          "focus-within:border-[var(--app-brass-highlight)] focus-within:ring-2 focus-within:ring-[rgba(216,178,116,0.22)]",
        )}
      >
        {value.map((userId) => {
          const resolvedName = selectedMap.get(userId);
          const displayName =
            resolvedName ?? (resolved === undefined ? "Loading user…" : userId);

          return (
            <span
              key={userId}
              className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-md border border-border bg-secondary pl-2.5 text-xs font-semibold text-foreground"
            >
              {resolved === undefined ? (
                <Loader2
                  className="size-3 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate">{displayName}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemove(userId);
                }}
                aria-label={`Remove ${resolvedName ?? userId}`}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--app-billiard-hover)] hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          );
        })}

        <div className="relative flex min-w-32 flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-1 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showResults}
            aria-controls={listboxId}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (hasSearch) setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={
              value.length === 0 ? "Search for a username…" : "Add another…"
            }
            className="min-h-8 w-full bg-transparent py-1 pr-2 pl-7 text-base text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-sm"
          />
        </div>
      </div>

      {value.length === 0 && !hasSearch ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No collaborators added.
        </p>
      ) : null}

      {showResults ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="User search results"
          aria-live="polite"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl"
        >
          {results === undefined ? (
            <div
              className="flex min-h-11 items-center gap-2 px-3 text-sm text-muted-foreground"
              role="option"
              aria-disabled="true"
              aria-selected="false"
              tabIndex={-1}
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </div>
          ) : filteredResults.length === 0 ? (
            <div
              role="option"
              aria-disabled="true"
              aria-selected="false"
              tabIndex={-1}
              className="px-3 py-3 text-sm text-muted-foreground"
            >
              No users found for “{search.trim()}”.
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto p-1">
              {filteredResults.map((entry) => (
                <div key={entry.userId} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => handleSelect(entry)}
                    className="flex min-h-11 w-full min-w-0 flex-col justify-center rounded-md px-3 py-2 text-left hover:bg-[var(--app-billiard-hover)]"
                  >
                    <span className="font-semibold text-foreground">
                      {entry.username}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.userId}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
