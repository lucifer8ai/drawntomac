import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { BackHeader } from "@/components/nav/BackHeader";

export const Route = createFileRoute("/_authenticated/user/$username")({
  ssr: false,
  component: UserProfilePage,
});

function UserProfilePage() {
  const { username } = Route.useParams();
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });
  }, []);

  return (
    <>
      <BackHeader label="Back" onBack={() => router.history.back()} solid />
      <PublicProfile username={username} viewerId={viewerId} />
    </>
  );
}
