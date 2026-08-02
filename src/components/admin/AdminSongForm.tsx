import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface SongArtist {
  artistId: string;
  artistName: string;
  position: number;
  joinPhrase: string;
}

interface AdminSongFormProps {
  song: {
    id: string;
    title: string;
    slug: string;
    genius_thumbnail_url: string | null;
    release_date: string | null;
    track_number: number | null;
    genre_tags: string[] | null;
    era: string | null;
    language: string[] | null;
  };
  songArtists: SongArtist[];
}

const ERA_OPTIONS = ["50s", "60s", "70s", "80s", "90s", "00s", "10s", "20s"];
const LANGUAGE_OPTIONS = ["english", "hindi", "punjabi", "tamil", "telugu", "korean", "spanish", "french", "other"];

export function AdminSongForm({ song, songArtists: initialArtists }: AdminSongFormProps) {
  const [title, setTitle] = useState(song.title);
  const [imageUrl, setImageUrl] = useState(song.genius_thumbnail_url ?? "");
  const [releaseDate, setReleaseDate] = useState(song.release_date ?? "");
  const [trackNumber, setTrackNumber] = useState(song.track_number?.toString() ?? "");
  const [genreTags, setGenreTags] = useState((song.genre_tags ?? []).join(", "));
  const [era, setEra] = useState(song.era ?? "");
  const [language, setLanguage] = useState((song.language ?? []).join(", "));
  const [artists, setArtists] = useState<SongArtist[]>(initialArtists);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const body: Record<string, any> = { songId: song.id };

      if (title !== song.title) body.title = title;
      if (imageUrl !== (song.genius_thumbnail_url ?? "")) body.imageUrl = imageUrl || undefined;
      const rd = releaseDate || undefined;
      if (rd !== (song.release_date ?? "")) body.releaseDate = rd;
      const tn = trackNumber ? parseInt(trackNumber) : undefined;
      if (tn !== song.track_number) body.trackNumber = tn;
      const gt = genreTags ? genreTags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      if (JSON.stringify(gt) !== JSON.stringify(song.genre_tags)) body.genreTags = gt;
      if (era !== (song.era ?? "")) body.era = era || undefined;
      const lang = language ? language.split(",").map((t) => t.trim()).filter(Boolean) : [];
      if (JSON.stringify(lang) !== JSON.stringify(song.language)) body.language = lang;

      if (Object.keys(body).length > 1) {
        await fetch("/api/admin/update-song", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
      }

      const artistChanged = JSON.stringify(artists.map((a) => a.artistId)) !== JSON.stringify(initialArtists.map((a) => a.artistId));
      if (artistChanged) {
        await fetch("/api/admin/update-song-artists", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            songId: song.id,
            artists: artists.map((a, i) => ({
              artistId: a.artistId,
              position: a.position ?? i,
              joinPhrase: a.joinPhrase,
            })),
          }),
        });
      }

      if (title !== song.title) {
        const { data: updated } = await supabase
          .from("songs")
          .select("slug")
          .eq("id", song.id)
          .single();
        if (updated) {
          navigate({ to: "/admin/songs/$slug", params: { slug: updated.slug }, replace: true });
          return;
        }
      }
      navigate({ to: "/admin/songs" });
    } finally {
      setSaving(false);
    }
  }

  function addArtist() {
    setArtists([...artists, { artistId: "", artistName: "", position: artists.length, joinPhrase: "" }]);
  }

  function removeArtist(index: number) {
    setArtists(artists.filter((_, i) => i !== index));
  }

  function updateArtist(index: number, field: keyof SongArtist, value: string | number) {
    const next = [...artists];
    (next[index] as any)[field] = value;
    setArtists(next);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin/songs" })}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft size={16} />
          Songs
        </button>
        <h1 className="font-bold text-2xl text-white">{song.title}</h1>
      </div>

      <div className="space-y-8">
        <ImageUploadField
          label="Song Artwork"
          currentUrl={song.genius_thumbnail_url}
          uploadPath={`songs/${song.id}.jpg`}
          onUploaded={(url) => setImageUrl(url)}
        />

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Release Date</label>
            <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Track #</label>
            <input type="number" value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Genre Tags (comma-separated)</label>
          <input type="text" value={genreTags} onChange={(e) => setGenreTags(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Era</label>
            <select value={era} onChange={(e) => setEra(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30">
              <option value="">None</option>
              {ERA_OPTIONS.map((e) => <option key={e} value={e} className="bg-[#0a0a0a]">{e}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Language (comma-separated)</label>
            <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)}
              placeholder="english, hindi, punjabi..."
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Artist Credits</label>
            <button type="button" onClick={addArtist} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition">
              <Plus size={14} /> Add Artist
            </button>
          </div>
          {artists.map((a, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input type="text" placeholder="Artist name" value={a.artistName} onChange={(e) => updateArtist(i, "artistName", e.target.value)}
                className="flex-1 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
              <input type="text" placeholder="Join phrase (feat.)" value={a.joinPhrase} onChange={(e) => updateArtist(i, "joinPhrase", e.target.value)}
                className="w-28 rounded border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30" />
              <button type="button" onClick={() => removeArtist(i)} className="text-muted-foreground hover:text-red-400 transition">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={handleSave} disabled={saving}
          className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
