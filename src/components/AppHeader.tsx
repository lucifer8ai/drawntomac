import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "feed" | "diary" | "discover";

type SearchHit = {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseDate: string | null;
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hit),
      });
      if (!res.ok) return;
      const { slug } = (await res.json()) as { slug: string };
      navigate({ to: "/song/$slug" as never, params: { slug } as never }).catch(() => {
        window.location.href = `/song/${slug}`;
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
        backgroundColor: "rgba(0,0,0,0.95)",
        borderColor: "rgba(245,240,232,0.08)",
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
            style={{ backgroundColor: "rgba(245,240,232,0.05)", border: "1px solid rgba(245,240,232,0.12)" }}
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
              style={{ backgroundColor: "rgba(20,18,15,0.98)", border: "1px solid rgba(245,240,232,0.08)" }}
            >
              {loading && <div className="p-3 text-xs text-white/50">Searching…</div>}
              {!loading && hits.length === 0 && (
                <div className="p-3 text-xs text-white/50">No matches.</div>
              )}
              {hits.map((h) => (
                <button
                  key={h.mbid}
                  onClick={() => pickSong(h)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5"
                >
                  <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center text-white/40 text-xs">
                    ♫
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{h.title}</div>
                    <div className="truncate text-xs" style={{ color: "#8A8276" }}>
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
          style={{ backgroundColor: "#D4556A", color: "white" }}
        >
          <Bell size={16} />
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#E07B6A", border: "2px solid #000000" }}
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
              style={{ color: active ? "#D4556A" : "rgba(255,255,255,0.6)" }}
            >
              {t.label}
              {active && (
                <span
                  className="absolute -bottom-px left-0 right-0 h-0.5"
                  style={{ backgroundColor: "#D4556A" }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
