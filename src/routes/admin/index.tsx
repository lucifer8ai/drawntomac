import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Music, Disc, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

export function AdminDashboard() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.auth.signOut();
      navigate({ to: "/" });
    } catch {
      toast.error("Could not sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage artists, albums, and songs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={16} />
          {busy ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/admin/artists"
          className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
        >
          <Mic className="mb-3 h-6 w-6 text-amber-400" />
          <h2 className="font-semibold text-white">Artists</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit names, images, slugs
          </p>
        </Link>

        <Link
          to="/admin/albums"
          className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
        >
          <Disc className="mb-3 h-6 w-6 text-violet-400" />
          <h2 className="font-semibold text-white">Albums</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit titles, covers, types
          </p>
        </Link>

        <Link
          to="/admin/songs"
          className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 transition hover:border-white/[0.12] hover:bg-white/[0.05]"
        >
          <Music className="mb-3 h-6 w-6 text-emerald-400" />
          <h2 className="font-semibold text-white">Songs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit titles, metadata, artists
          </p>
        </Link>
      </div>
    </div>
  );
}
