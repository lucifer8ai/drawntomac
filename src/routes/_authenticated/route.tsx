import { useEffect, useState, createContext, useContext } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/nav/BottomNav";
import { ProfileSheet } from "@/components/profile/ProfileSheet";

type Tab = "feed" | "diary" | "discover";
type DiscoverSection = "for-you" | "new" | "trending" | "people";

interface TabContextValue {
  activeTab: Tab;
  setTab: (t: Tab) => void;
  profile: { display_name: string | null; avatar_url: string | null; username: string } | null;
  discoverSection: DiscoverSection;
  setDiscoverSection: (s: DiscoverSection) => void;
}

export const TabContext = createContext<TabContextValue>({
  activeTab: "feed",
  setTab: () => {},
  profile: null,
  discoverSection: "for-you",
  setDiscoverSection: () => {},
});

export const useTabContext = () => useContext(TabContext);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [tab, setTab] = useState<Tab>("feed");
  const [discoverSection, setDiscoverSection] = useState<DiscoverSection>("for-you");
  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
    <TabContext.Provider value={{ activeTab: tab, setTab, profile, discoverSection, setDiscoverSection }}>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader
          activeTab={tab}
          onTabChange={setTab}
          avatarUrl={profile?.avatar_url}
          displayName={profile?.display_name ?? profile?.username}
          onProfileClick={() => setProfileOpen(true)}
        />
        <Outlet />
        <BottomNav activeTab={tab} onTabChange={setTab} />
        <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>
    </TabContext.Provider>
  );
}
