import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/home" });
      }
      if (event === "SIGNED_OUT") {
        navigate({ to: "/" });
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        toast.error("Authentication failed. Please try again.");
        navigate({ to: "/" });
      } else if (data.session) {
        navigate({ to: "/home" });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">Signing you in...</p>
    </div>
  );
}
