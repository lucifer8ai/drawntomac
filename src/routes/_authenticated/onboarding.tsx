import { useState, useCallback } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArtistSelector } from "@/components/onboarding/ArtistSelector";
import { SongTagger } from "@/components/onboarding/SongTagger";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { CityStep } from "@/components/onboarding/CityStep";
import { CompletionScreen } from "@/components/onboarding/CompletionScreen";

type Step = 1 | 2 | 3 | 4;

interface OnboardingSearch {
  step?: number;
}

export const Route = createFileRoute("/_authenticated/onboarding")({
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
    return { step: step >= 1 && step <= 4 ? step : 1 };
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
  const [heardCount, setHeardCount] = useState(0);
  const [songCount, setSongCount] = useState(0);

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

  const handleSongsConfirm = useCallback(() => {
    goTo(3);
  }, [goTo]);

  const handleProfileComplete = useCallback(() => {
    goTo(4);
  }, [goTo]);

  const handleCityComplete = useCallback(() => {
    setShowComplete(true);
  }, []);

  if (showComplete) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 relative"
        style={{
          backgroundImage: `url('/pictures/onboarding-bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/85 z-0" />
        <div className="w-full max-w-md relative z-10">
          <CompletionScreen
            artistCount={selectedArtists.length}
            songCount={songCount}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-8 relative"
      style={{
        backgroundImage: `url('/pictures/onboarding-bg.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/85 z-0" />
      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Step dots */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "DM Sans, sans-serif", color: "oklch(0.85 0 0)" }}>
            #d.To
          </h1>
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4] as const).map((s) => (
              <div
                key={s}
                role="tab"
                aria-current={s === step ? "step" : undefined}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  s === step ? "bg-foreground" : "bg-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <ArtistSelector
            selectedArtistIds={selectedArtists}
            onConfirm={handleArtistConfirm}
          />
        )}

        {step === 2 && (
          <SongTagger
            artistIds={selectedArtists}
            onConfirm={handleSongsConfirm}
            onCountsChange={(heard, total) => {
              setHeardCount(heard);
              setSongCount(total);
            }}
          />
        )}

        {step === 3 && (
          <ProfileStep onComplete={handleProfileComplete} />
        )}

        {step === 4 && (
          <CityStep onComplete={handleCityComplete} />
        )}
      </div>
    </div>
  );
}
