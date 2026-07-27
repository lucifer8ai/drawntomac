import { useEffect, useState, createContext, useContext } from "react";
import { createFileRoute, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
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
  triggerSearch: () => void;
}

export const TabContext = createContext<TabContextValue>({
  activeTab: "feed",
  setTab: () => {},
  profile: null,
  discoverSection: "for-you",
  setDiscoverSection: () => {},
  triggerSearch: () => {},
});

export const useTabContext = () => useContext(TabContext);

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });
    if (!location.pathname.startsWith("/onboarding")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile || !profile.onboarding_completed) {
        throw redirect({ to: "/onboarding", search: { step: 1 } });
      }
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [tab, setTab] = useState<Tab>("feed");
  const [discoverSection, setDiscoverSection] = useState<DiscoverSection>("for-you");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
    username: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (router.state.location.pathname !== "/home") {
      navigate({ to: "/home" });
    }
  };

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
    <TabContext.Provider value={{ activeTab: tab, setTab: handleTabChange, profile, discoverSection, setDiscoverSection, triggerSearch: () => setSearchTrigger((n) => n + 1) }}>
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader
          activeTab={tab}
          onTabChange={handleTabChange}
          avatarUrl={profile?.avatar_url}
          displayName={profile?.display_name ?? profile?.username}
          onProfileClick={() => setProfileOpen(true)}
          triggerSearch={searchTrigger}
        />
        <Outlet />
        <BottomNav activeTab={tab} onTabChange={handleTabChange} />
        <ProfileSheet
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          onProfileUpdate={(fields) => {
            setProfile((prev) =>
              prev ? { ...prev, ...fields } : prev
            );
          }}
        />
      </div>
    </TabContext.Provider>
  );
}
