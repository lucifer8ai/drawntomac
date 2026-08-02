import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface AdminArtistFormProps {
  artist: { id: string; name: string; slug: string; image_url: string | null };
}

export function AdminArtistForm({ artist }: AdminArtistFormProps) {
  const [name, setName] = useState(artist.name);
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/admin/update-artist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          artistId: artist.id,
          name: name !== artist.name ? name : undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        navigate({ to: "/admin/artists/$slug", params: { slug: updated.slug }, replace: true });
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
          onClick={() => navigate({ to: "/admin/artists" })}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft size={16} />
          Artists
        </button>
        <h1 className="font-bold text-2xl text-white">{artist.name}</h1>
      </div>

      <div className="space-y-8">
        <ImageUploadField
          label="Artist Image"
          currentUrl={artist.image_url}
          uploadPath={`artists/${artist.id}.jpg`}
          onUploaded={(url) => setImageUrl(url)}
        />

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/30"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Changing the name will also update the URL slug.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
