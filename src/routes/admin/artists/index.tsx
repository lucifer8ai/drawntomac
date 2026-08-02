import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/artists/")({
  component: AdminArtistsList,
});

function AdminArtistsList() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; slug: string; image_url: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return;

    const url = new URL("/api/admin/search-entities", window.location.origin);
    url.searchParams.set("q", q);
    url.searchParams.set("type", "artist");

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setResults(data);
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/admin" className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <ArrowLeft size={16} />
          Admin
        </Link>
        <h1 className="font-bold text-2xl text-white">Artists</h1>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search artists..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/30"
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Searching...</p>}

      <div className="space-y-1">
        {results.map((artist) => (
          <Link
            key={artist.id}
            to="/admin/artists/$slug"
            params={{ slug: artist.slug }}
            className="flex items-center gap-4 rounded-lg px-3 py-2 transition hover:bg-white/[0.04]"
          >
            {artist.image_url ? (
              <img
                src={artist.image_url}
                alt={artist.name}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-xs text-muted-foreground">
                {artist.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-medium text-white">{artist.name}</p>
              <p className="text-xs text-muted-foreground">{artist.slug}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
