import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { SearchHit, CategorizedResults } from "@/routes/api/search";

type Tab = "feed" | "diary" | "discover";

export function AppHeader({
  activeTab,
  onTabChange,
  avatarUrl,
  displayName,
  onProfileClick,
  triggerSearch,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  avatarUrl?: string | null;
  displayName?: string | null;
  onProfileClick: () => void;
  triggerSearch?: number;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CategorizedResults>({ songs: [], artists: [], albums: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const navigate = useNavigate();

  function expandSearch() {
    setSearchExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function collapseSearch() {
    if (!q.trim()) setSearchExpanded(false);
  }

  useEffect(() => {
    if (triggerSearch && triggerSearch > 0) {
      expandSearch();
    }
  }, [triggerSearch]);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults({ songs: [], artists: [], albums: [] });
      setOpen(false);
      setSearchError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    let searchQ = query;
    let artistParam = "";
    const slashIdx = query.indexOf("/");
    if (slashIdx > 0 && slashIdx < query.length - 1) {
      searchQ = query.substring(0, slashIdx).trim();
      artistParam = query.substring(slashIdx + 1).trim();
    }

    const t = setTimeout(async () => {
      try {
        const url = `/api/search?q=${encodeURIComponent(searchQ)}`;
        const finalUrl = artistParam
          ? `${url}&artist=${encodeURIComponent(artistParam)}`
          : url;
        const res = await fetch(finalUrl);
        const json = (await res.json()) as CategorizedResults & { error?: string };
        if (!cancelled) {
          if (json.error) {
            setSearchError(true);
            setResults({ songs: [], artists: [], albums: [] });
          } else {
            setSearchError(false);
            setResults({
              songs: Array.isArray(json.songs) ? json.songs : [],
              artists: Array.isArray(json.artists) ? json.artists : [],
              albums: Array.isArray(json.albums) ? json.albums : [],
            });
          }
          setHighlightIdx(-1);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setSearchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  // Flatten all categorized hits into one linear navigation list
  const flatHits = useMemo(() => {
    const all: (SearchHit & { sectionIdx: number })[] = [];
    results.songs.forEach((h) => all.push({ ...h, sectionIdx: 0 }));
    results.artists.forEach((h) => all.push({ ...h, sectionIdx: 1 }));
    results.albums.forEach((h) => all.push({ ...h, sectionIdx: 2 }));
    return all;
  }, [results]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.focus();
        return;
      }
      if (!flatHits.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev + 1 >= flatHits.length ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev <= 0 ? flatHits.length - 1 : prev - 1));
      } else if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        pickResult(flatHits[highlightIdx]);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, flatHits, highlightIdx]);

  const navigating = useRef(false);

  async function pickResult(hit: SearchHit) {
    if (navigating.current) return;
    navigating.current = true;
    setOpen(false);
    setQ("");

    try {
      if (hit.category === "song") {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hit),
        });
        if (!res.ok) {
          let message = "Import failed.";
          try {
            const { error } = (await res.json()) as { error?: string };
            if (error) message = error;
          } catch {
            /* ignore */
          }
          toast.error(message);
          return;
        }
        const { slug } = (await res.json()) as { slug: string };
        navigate({ to: "/song/$slug" as never, params: { slug } as never }).catch(() => {
          window.location.href = `/song/${slug}`;
        });
      } else if (hit.category === "artist") {
        if (hit.slug) {
          navigate({ to: "/artist/$slug" as never, params: { slug: hit.slug } as never });
        } else {
          toast("Artist page not available yet");
        }
      } else if (hit.category === "album") {
        if (hit.slug) {
          navigate({ to: "/album/$slug" as never, params: { slug: hit.slug } as never });
        } else {
          toast("Album page not available");
        }
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      navigating.current = false;
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "diary", label: "Diary" },
    { id: "discover", label: "Discover" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 md:gap-4 px-4 py-3">
        <Link
          to="/home"
          className="shrink-0 text-2xl font-black tracking-tight text-foreground"
        >
          <span className="md:hidden">#d.To</span>
          <span className="hidden md:inline">#drawnto</span>
        </Link>

        <div ref={boxRef} className="relative mx-2 flex-1 max-w-xl">
          {!searchExpanded ? (
            <button
              type="button"
              onClick={expandSearch}
              className="flex md:hidden items-center justify-center h-11 w-11 rounded-lg border bg-input/40 text-muted-foreground"
            >
              <Search size={16} />
            </button>
          ) : null}
          <div
            className={`${
              searchExpanded ? "flex" : "hidden md:flex"
            } items-center gap-2 rounded-lg border bg-input/40 px-4 py-2`}
          >
            <Search size={16} className="text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => { const hasResults = results.songs.length > 0 || results.artists.length > 0 || results.albums.length > 0; if (hasResults) setOpen(true); }}
              onBlur={collapseSearch}
              placeholder="Search song or song/artist"
              className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
            />
          </div>
          {open && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[420px] overflow-y-auto rounded-2xl border bg-popover/98 p-2"
            >
              {loading && (
                <div className="p-3 text-xs text-muted-foreground">
                  Searching…
                </div>
              )}
              {searchError && !loading && (
                <div className="p-3 text-xs text-destructive/80">
                  Search unavailable — try again
                </div>
              )}
              {!loading && !searchError && flatHits.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">
                  No matches.
                </div>
              )}
              {!loading && !searchError && (
                <>
                  <SearchSection
                    label="Songs"
                    hits={results.songs}
                    sectionIdx={0}
                    highlightIdx={highlightIdx}
                    baseOffset={0}
                    sectionOffsets={[0,
                      results.songs.length,
                      results.songs.length + results.artists.length,
                    ]}
                    onPick={pickResult}
                  />
                  <SearchSection
                    label="Artists"
                    hits={results.artists}
                    sectionIdx={1}
                    highlightIdx={highlightIdx}
                    baseOffset={results.songs.length}
                    sectionOffsets={[0,
                      results.songs.length,
                      results.songs.length + results.artists.length,
                    ]}
                    onPick={pickResult}
                  />
                  <SearchSection
                    label="Albums"
                    hits={results.albums}
                    sectionIdx={2}
                    highlightIdx={highlightIdx}
                    baseOffset={results.songs.length + results.artists.length}
                    sectionOffsets={[0,
                      results.songs.length,
                      results.songs.length + results.artists.length,
                    ]}
                    onPick={pickResult}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-want text-sm font-bold text-want-foreground active:scale-[0.97] transition-transform duration-150"
          title={displayName ?? "Profile"}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName ?? "Profile"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            (displayName ?? "U").slice(0, 1).toUpperCase()
          )}
        </button>
      </div>

      <nav className="mx-auto hidden md:flex max-w-6xl items-center gap-6 px-4">
        {tabs.map((t) => {
          const active = t.id === activeTab;
          return (
            <button
              type="button"
              key={t.id}
              aria-current={active ? "page" : undefined}
              onClick={() => onTabChange(t.id)}
              className={`relative py-3 text-sm font-semibold transition-colors ${
                active ? "text-primary" : "text-foreground/60"
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function SearchSection({
  label,
  hits,
  sectionIdx,
  highlightIdx,
  baseOffset,
  sectionOffsets,
  onPick,
}: {
  label: string;
  hits: SearchHit[];
  sectionIdx: number;
  highlightIdx: number;
  baseOffset: number;
  sectionOffsets: number[];
  onPick: (hit: SearchHit) => void;
}) {
  const sectionHits = hits;

  return (
    <div
      className={sectionIdx > 0 ? "" : ""}
      style={{
        animationDelay: `${sectionIdx * 80}ms`,
      }}
    >
      <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label} {sectionHits.length > 0 && `(${sectionHits.length})`}
      </div>
      {sectionHits.length === 0 ? (
        <div className="px-2 pb-2 text-[11px] italic text-muted-foreground/50">
          No {label.toLowerCase()} found
        </div>
      ) : (
        sectionHits.map((hit, i) => {
          const globalIdx = baseOffset + i;
          const isHighlighted = highlightIdx === globalIdx;
          return (
            <button
              type="button"
              key={`${hit.category}-${hit.mbid}`}
              role="option"
              aria-selected={isHighlighted}
              onClick={() => onPick(hit)}
              onMouseEnter={() => {
                /* highlight handled via CSS hover */
              }}
              className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 ${
                isHighlighted ? "bg-white/5" : ""
              }`}
            >
              {hit.category === "artist" ? (
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
                  {hit.title.slice(0, 1).toUpperCase()}
                </div>
              ) : hit.thumbnailUrl ? (
                <img
                  src={hit.thumbnailUrl}
                  alt={`${hit.title} art`}
                  className={`h-10 w-10 object-cover flex-shrink-0 ${
                    hit.category === "album" ? "rounded" : "rounded"
                  }`}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">
                  ♫
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {hit.title}
                </div>
                {hit.subtitle ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {hit.subtitle}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
