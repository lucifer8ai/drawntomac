import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";

type Tab = "feed" | "diary" | "discover";

type SearchHit = {
  mbid: string;
  title: string;
  artistName: string;
  primaryArtistName: string;
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseDate: string | null;
  thumbnailUrl: string | null;
};

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
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    // Parse "song/artist" format for precise search
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
        const json = (await res.json()) as SearchHit[];
        if (!cancelled) {
          setHits(Array.isArray(json) ? json : []);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pickSong(hit: SearchHit) {
    setOpen(false);
    setQ("");
    try {
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
        } catch {}
        toast.error(message);
        return;
      }
      const { slug } = (await res.json()) as { slug: string };
      navigate({ to: "/song/$slug" as never, params: { slug } as never }).catch(() => {
        window.location.href = `/song/${slug}`;
      });
    } catch {
      toast.error("Something went wrong. Try again.");
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
              onFocus={() => hits.length > 0 && setOpen(true)}
              onBlur={collapseSearch}
              placeholder="Search song or song/artist"
              className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
            />
          </div>
          {open && (
            <div className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[320px] overflow-y-auto rounded-2xl border bg-popover/98 p-2 shadow-2xl animate-scale-in">
              {loading && <div className="p-3 text-xs text-muted-foreground">Searching…</div>}
              {!loading && hits.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">No matches.</div>
              )}
              {hits.map((h) => (
                <button
                  type="button"
                  key={h.mbid}
                  onClick={() => pickSong(h)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
                >
                  {h.thumbnailUrl ? (
                    <img
                      src={h.thumbnailUrl}
                      alt={`${h.title} album art`}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">
                      ♫
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{h.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {h.artistName}
                    </div>
                  </div>
                </button>
              ))}
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
            <img src={avatarUrl} alt={displayName ?? "Profile"} className="h-full w-full object-cover" loading="lazy" />
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
