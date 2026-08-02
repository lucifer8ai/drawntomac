import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface AdminAlbumFormProps {
  album: {
    id: string;
    title: string;
    slug: string;
    image_url: string | null;
    primary_type: string | null;
    release_date: string | null;
  };
}

const TYPE_OPTIONS = ["Album", "EP", "Single", "Other"];

export function AdminAlbumForm({ album }: AdminAlbumFormProps) {
  const [title, setTitle] = useState(album.title);
  const [imageUrl, setImageUrl] = useState(album.image_url ?? "");
  const [primaryType, setPrimaryType] = useState(album.primary_type ?? "");
  const [releaseDate, setReleaseDate] = useState(album.release_date ?? "");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const body: Record<string, string | undefined> = {
        releaseGroupId: album.id,
        title: title !== album.title ? title : undefined,
        imageUrl: imageUrl || undefined,
        primaryType: primaryType !== (album.primary_type ?? "") ? primaryType : undefined,
        releaseDate: releaseDate !== (album.release_date ?? "") ? releaseDate : undefined,
      };

      const res = await fetch("/api/admin/update-release-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        navigate({ to: "/admin/albums/$slug", params: { slug: updated.slug }, replace: true });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin/albums" })}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft size={16} />
          Albums
        </button>
        <h1 className="font-bold text-2xl text-white">{album.title}</h1>
      </div>

      <div className="space-y-8">
        <ImageUploadField
          label="Album Cover"
          currentUrl={album.image_url}
          uploadPath={`release-groups/${album.id}.jpg`}
          onUploaded={(url) => setImageUrl(url)}
        />

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/30"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Changing the title will also update the URL slug.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type
          </label>
          <select
            value={primaryType}
            onChange={(e) => setPrimaryType(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30"
          >
            <option value="">None</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} className="bg-[#0a0a0a]">
                {t}
              </option>
            ))}
          </select>
          {primaryType && primaryType !== "Album" && (
            <p className="mt-1 text-xs text-amber-400/80">
              Note: Album artwork for {primaryType}s is not currently displayed to users (only Album covers are shown).
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Release Date
          </label>
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-400/30"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
