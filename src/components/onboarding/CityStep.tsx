import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/profile/LocationPicker";
import { toast } from "sonner";

interface CityStepProps {
  onComplete: () => void;
  selectedArtists: string[];
}

export function CityStep({ onComplete, selectedArtists }: CityStepProps) {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedArtists || selectedArtists.length === 0) {
      toast.error("Please go back and select artists first.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let updateError: any = null;

      if (locationId) {
        const { data: loc } = await supabase
          .from("locations")
          .select("city, country")
          .eq("id", locationId)
          .maybeSingle();

        const { error } = await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            onboarding_step: 3,
            location_id: locationId,
            city: loc?.city ?? null,
            country: loc?.country,
            discover_artist_ids: selectedArtists,
          })
          .eq("id", user.id);

        updateError = error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({
            onboarding_completed: true,
            onboarding_step: 3,
            discover_artist_ids: selectedArtists,
          })
          .eq("id", user.id);

        updateError = error;
      }

      if (updateError) throw updateError;

      sessionStorage.removeItem("onboarding_artists");
      onComplete();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!selectedArtists || selectedArtists.length === 0) {
      toast.error("Please go back and select artists first.");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          onboarding_step: 3,
          discover_artist_ids: selectedArtists,
        })
        .eq("id", user.id);

      if (error) throw error;
      sessionStorage.removeItem("onboarding_artists");
      onComplete();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-border/50 bg-raised/50 p-6 backdrop-blur-sm">
      <div className="space-y-2">
        <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Where are you? <span className="text-muted-foreground text-lg">(optional)</span>
        </h2>
        <p className="text-base text-muted-foreground">
          Helps us find people near you.
        </p>
      </div>

      <LocationPicker value={locationId} onChange={setLocationId} />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 min-h-[44px] rounded-lg font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="flex-1 min-h-[44px] rounded-lg font-semibold text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
