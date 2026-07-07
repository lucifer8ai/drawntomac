import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
    <div className="min-h-screen" style={{ backgroundColor: "#000000", color: "white" }}>
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

  const pills: { id: FeedPill; label: string }[] = [
    { id: "new", label: "New Releases" },
    { id: "top", label: "Top Rated This Week" },
    { id: "following", label: "From People You Follow" },
  ];

  return (
    <div>
      <div
        style={{
          background: "#000000",
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
                backgroundColor: active ? "#D4556A" : "#000000",
                color: active ? "white" : "#8A8276",
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

      <div style={{ padding: "80px 12px", textAlign: "center", color: "#8A8276", fontSize: 14 }}>
        Coming soon — MusicBrainz-powered feed.
      </div>
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
      style={{ backgroundColor: "#000000", border: "1px solid rgba(245,240,232,0.08)" }}
    >
      <h2 className="text-xl font-bold" style={{ color: "#D4556A" }}>
        {copy.title}
      </h2>
      <p className="mt-2 text-sm" style={{ color: "#8A8276" }}>
        {copy.body}
      </p>
    </div>
  );
}
