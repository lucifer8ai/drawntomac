import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PublicProfile } from "@/components/profile/PublicProfile";

export const Route = createFileRoute("/_authenticated/user/$username")({
  ssr: false,
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });
  }, []);

  return <PublicProfile username={username} viewerId={viewerId} />;
}
