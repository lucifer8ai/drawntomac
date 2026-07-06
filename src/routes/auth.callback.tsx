import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = "/home";
      } else if (event === "SIGNED_OUT") {
        window.location.href = "/";
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/home";
      }
    });
  }, []);

  return (
    <div style={{ backgroundColor: "#0D0A06", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8A7A6A", fontFamily: "Inter, sans-serif" }}>
      Signing you in...
    </div>
  );
}
