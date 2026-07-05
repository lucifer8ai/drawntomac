import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "feed" | "diary" | "discover";

type SearchHit = {
  spotifyId: string;
  title: string;
  artistName: string;
  artistSpotifyId: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
  spotifyUrl: string | null;
  releaseDate: string | null;
  slug: string;
};

export function AppHeader({
  activeTab,
  onTabChange,
  avatarUrl,
  displayName,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  avatarUrl?: string | null;
  displayName?: string | null;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setHits([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function pickSong(hit: SearchHit) {
    setOpen(false);
    setQ("");
    try {
      const res = await fetch("/api/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "track", ...hit }),
      });
      if (!res.ok) return;
      const { slug } = (await res.json()) as { slug: string };
      navigate({ to: "/song/$slug" as never, params: { slug } as never }).catch(() => {
        window.location.href = `/songs/${slug}`;
      });
    } catch {
      // swallow
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "feed", label: "Feed" },
    { id: "diary", label: "Diary" },
    { id: "discover", label: "Discover" },
  ];

  return (
    <header
      className="sticky top-0 z-40 w-full border-b"
      style={{
        backgroundColor: "rgba(13,10,6,0.95)",
        borderColor: "#2A2028",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/home" className="shrink-0 text-2xl font-black tracking-tight text-white">
          #drawnto
        </Link>

        <div ref={boxRef} className="relative mx-2 flex-1 max-w-xl">
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}
          >
            <Search size={16} className="text-white/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => hits.length > 0 && setOpen(true)}
              placeholder="Search music"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />
          </div>
          {open && (
            <div
              className="absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[320px] overflow-y-auto rounded-2xl p-2 shadow-2xl"
              style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}
            >
              {loading && <div className="p-3 text-xs text-white/50">Searching…</div>}
              {!loading && hits.length === 0 && (
                <div className="p-3 text-xs text-white/50">No matches.</div>
              )}
              {hits.map((h) => (
                <button
                  key={h.spotifyId}
                  onClick={() => pickSong(h)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
                >
                  {h.coverUrl ? (
                    <img
                      src={h.coverUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-white/10" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{h.title}</div>
                    <div className="truncate text-xs" style={{ color: "#8A7A6A" }}>
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
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "#E8624A", color: "white" }}
        >
          <Bell size={16} />
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#E07B6A", border: "2px solid #0D0A06" }}
          />
        </button>

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: "#9D8EC4" }}
          title={displayName ?? "Sign out"}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (displayName ?? "U").slice(0, 1).toUpperCase()
          )}
        </button>
      </div>

      <nav
        className="mx-auto flex max-w-6xl items-center gap-6 px-4"
        style={{ borderTop: "1px solid transparent" }}
      >
        {tabs.map((t) => {
          const active = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="relative py-3 text-sm font-semibold transition-colors"
              style={{ color: active ? "#E8624A" : "rgba(255,255,255,0.6)" }}
            >
              {t.label}
              {active && (
                <span
                  className="absolute -bottom-px left-0 right-0 h-0.5"
                  style={{ backgroundColor: "#E8624A" }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
