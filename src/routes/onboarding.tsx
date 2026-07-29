import { useState, useCallback } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArtistSelector } from "@/components/onboarding/ArtistSelector";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { CityStep } from "@/components/onboarding/CityStep";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";

type Step = 1 | 2 | 3;

interface OnboardingSearch {
  step?: number;
}

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, onboarding_step")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile?.onboarding_completed) throw redirect({ to: "/home" });
  },
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => {
    const step = typeof search.step === "number" ? search.step : Number(search.step);
    return { step: step >= 1 && step <= 3 ? step : 1 };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { step: searchStep } = Route.useSearch();
  const step = (searchStep ?? 1) as Step;
  const navigate = useNavigate();
  const [showComplete, setShowComplete] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("onboarding_artists");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const goTo = useCallback(
    (s: number) => {
      navigate({ to: "/onboarding", search: { step: s } });
    },
    [navigate],
  );

  const handleArtistConfirm = useCallback((artistIds: string[]) => {
    setSelectedArtists(artistIds);
    sessionStorage.setItem("onboarding_artists", JSON.stringify(artistIds));
    goTo(2);
  }, [goTo]);

  const handleProfileComplete = useCallback(() => {
    goTo(3);
  }, [goTo]);

  const handleCityComplete = useCallback(() => {
    setShowComplete(true);
  }, []);

  const backgroundLayers = (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, transparent 25%, oklch(0.04 0.002 280 / 0.85) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/pictures/onboarding-bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.25,
        }}
      />
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 z-0 h-[2px]"
        style={{ backgroundColor: "oklch(0.85 0 0 / 0.35)" }}
      />
    </>
  );

  if (showComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative">
        {backgroundLayers}
        <div className="w-full max-w-md relative z-10 animate-fade-in-up">
          <CompletionScreen
            artistCount={selectedArtists.length}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-8 relative">
      {backgroundLayers}
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as const).map((s) => (
              <div
                key={s}
                role="tab"
                aria-current={s === step ? "step" : undefined}
                aria-label={`Step ${s} of 3${s === step ? ", current" : ""}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step
                    ? "bg-primary w-6 animate-pulse"
                    : "bg-foreground/20 w-2"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div key="step-1" className="animate-fade-in-up">
            <ArtistSelector
              selectedArtistIds={selectedArtists}
              max={3}
              requireExact={true}
              onConfirm={handleArtistConfirm}
            />
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="animate-fade-in-up">
            <ProfileStep onComplete={handleProfileComplete} />
          </div>
        )}

        {step === 3 && (
          <div key="step-3" className="animate-fade-in-up">
            <CityStep onComplete={handleCityComplete} selectedArtists={selectedArtists} />
          </div>
        )}
      </div>
    </div>
  );
}
