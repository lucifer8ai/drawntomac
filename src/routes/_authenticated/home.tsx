import { useEffect, useRef, useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [{ title: "#drawnto" }],
  }),
  component: HomePage,
});

type Tab = "feed" | "diary" | "discover";
type FeedPill = "new" | "top" | "following";

type Album = {
  type: "album";
  spotifyId: string;
  albumName: string;
  artistName: string;
  artistSpotifyId: string | null;
  coverUrl: string | null;
  releaseDate: string | null;
  spotifyUrl: string | null;
  slug: string;
};

function HomePage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; username: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data) setProfile(data);
    })();
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0D0A06", color: "white" }}>
      <AppHeader
        activeTab={tab}
        onTabChange={setTab}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name ?? profile?.username}
      />
      {tab === "feed" ? (
        <FeedPage />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-16">
          <EmptyPanel tab={tab} />
        </main>
      )}
    </div>
  );
}

function FeedPage() {
  const [pill, setPill] = useState<FeedPill>("new");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadMore = useCallback(
    async (nextOffset: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (replace) setLoading(true);
      try {
        const res = await fetch(`/api/spotify/new-releases?offset=${nextOffset}`);
        const json = (await res.json()) as { albums: Album[]; total: number };
        const items = json.albums ?? [];
        setAlbums((prev) => (replace ? items : [...prev, ...items]));
        setOffset(nextOffset + items.length);
        if (items.length < 50) setDone(true);
        if (replace && items.length === 0) setError(true);
      } catch {
        if (replace) setError(true);
      } finally {
        fetchingRef.current = false;
        if (replace) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (pill !== "new") return;
    setError(false);
    setDone(false);
    setAlbums([]);
    setOffset(0);
    loadMore(0, true);
  }, [pill, loadMore]);

  useEffect(() => {
    if (pill !== "new" || done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !fetchingRef.current && !done) {
          loadMore(offset, false);
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pill, offset, done, loadMore, albums.length]);

  async function openAlbum(a: Album) {
    try {
      const res = await fetch("/api/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "album",
          spotifyId: a.spotifyId,
          title: a.albumName,
          artistName: a.artistName,
          artistSpotifyId: a.artistSpotifyId,
          coverUrl: a.coverUrl,
          spotifyUrl: a.spotifyUrl,
          releaseDate: a.releaseDate,
          slug: a.slug,
        }),
      });
      if (!res.ok) return;
      const { slug } = (await res.json()) as { slug: string };
      navigate({ to: "/song/$slug" as never, params: { slug } as never }).catch(() => {
        window.location.href = `/songs/${slug}`;
      });
    } catch {
      // noop
    }
  }

  const pills: { id: FeedPill; label: string }[] = [
    { id: "new", label: "New Releases" },
    { id: "top", label: "Top Rated This Week" },
    { id: "following", label: "From People You Follow" },
  ];

  return (
    <div>
      <div
        style={{
          background: "#0D0A06",
          padding: "8px 12px",
          display: "flex",
          gap: 8,
        }}
      >
        {pills.map((p) => {
          const active = p.id === pill;
          return (
            <button
              key={p.id}
              onClick={() => setPill(p.id)}
              style={{
                backgroundColor: active ? "#E8624A" : "#1A1510",
                color: active ? "white" : "#8A7A6A",
                borderRadius: 999,
                fontSize: 13,
                padding: "6px 14px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {pill !== "new" ? (
        <div style={{ padding: "80px 12px", textAlign: "center", color: "#8A7A6A", fontSize: 14 }}>
          Nothing here yet.
        </div>
      ) : loading ? (
        <SkeletonGrid />
      ) : albums.length === 0 || error ? (
        <div style={{ padding: "80px 12px", textAlign: "center", color: "#8A7A6A", fontSize: 14 }}>
          Couldn&apos;t load releases.
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 2,
              padding: 0,
              margin: 0,
            }}
          >
            {albums.map((a) => (
              <AlbumCell key={a.spotifyId} album={a} onClick={() => openAlbum(a)} />
            ))}
          </div>
          <div ref={sentinelRef} style={{ height: 1 }} />
        </>
      )}
    </div>
  );
}

function AlbumCell({ album, onClick }: { album: Album; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        aspectRatio: "1 / 1",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        backgroundColor: "#1A1510",
      }}
    >
      {album.coverUrl && (
        <img
          src={album.coverUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 0,
            transition: "opacity 0.18s ease",
            opacity: hover ? 0.65 : 1,
            display: "block",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          opacity: hover ? 1 : 0,
          transition: "opacity 0.18s ease",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 8,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: "white",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {album.albumName}
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            fontWeight: 400,
            color: "#8A7A6A",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 2,
          }}
        >
          {album.artistName}
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 2,
        padding: 0,
        margin: 0,
      }}
    >
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            aspectRatio: "1 / 1",
            backgroundColor: "#1A1510",
          }}
        />
      ))}
    </div>
  );
}

function EmptyPanel({ tab }: { tab: Tab }) {
  const copy = {
    feed: {
      title: "Your Feed is quiet.",
      body: "Follow friends and artists — their listens and reviews land here.",
    },
    diary: {
      title: "Start your Diary.",
      body: "Log what you listened to today. Rate it, note it, keep the receipts.",
    },
    discover: {
      title: "Discover something new.",
      body: "New releases, cult favourites, and what the community is drawn to.",
    },
  }[tab];
  return (
    <div
      className="mx-auto max-w-md rounded-3xl p-10 text-center"
      style={{ backgroundColor: "#1A1510", border: "1px solid #2A2028" }}
    >
      <h2 className="text-xl font-bold" style={{ color: "#E8624A" }}>
        {copy.title}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "#8A7A6A" }}>
        {copy.body}
      </p>
    </div>
  );
}
