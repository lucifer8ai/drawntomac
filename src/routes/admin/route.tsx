import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.is_admin) throw redirect({ to: "/home" });
    if (!profile?.onboarding_completed) throw redirect({ to: "/onboarding" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <Outlet />
    </div>
  );
}
