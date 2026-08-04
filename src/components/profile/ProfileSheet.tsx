import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProfileEditForm } from "./ProfileEditForm";
import { FollowListSheet } from "./FollowListSheet";
import { AccountSettings } from "./AccountSettings";
import { ProfileStatsRow } from "./ProfileStatsRow";
import { useProfile } from "@/hooks/useProfile";
import { useProfileStats } from "@/hooks/useProfileStats";
import { LogOut, Pencil, ExternalLink, ArrowLeft } from "lucide-react";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  onProfileUpdate?: (fields: { display_name?: string | null; avatar_url?: string | null }) => void;
}

export function ProfileSheet({ open, onClose, onProfileUpdate }: ProfileSheetProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [followSheet, setFollowSheet] = useState<"following" | "followers" | null>(null);

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id ?? null);
      });
    }
  }, [open]);

  const {
    profile,
    stats,
    loading,
    saving,
    updateProfile,
    uploadAvatar,
    uploadBanner,
  } = useProfile(userId);

  const { stats: tasteStats, loading: statsLoading } = useProfileStats(userId);

  const displayName = profile?.display_name ?? profile?.username ?? "";
  const locationText = profile?.city && profile?.country
    ? `${profile.city}, ${profile.country}`
    : profile?.country ?? null;

  function handleSignOut() {
    onClose();
    supabase.auth.signOut();
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-sm p-0"
        >
          {/* Back button — visible at all times */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/50 border border-white/10 backdrop-blur-md text-sm font-medium text-white active:bg-black/70"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {loading && !profile ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : editing && userId && profile ? (
            <div className="relative overflow-y-auto max-h-full">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="absolute top-3 left-4 z-10 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <ProfileEditForm
                initial={{
                  display_name: profile.display_name,
                  bio: profile.bio,
                  pronouns: profile.pronouns,
                  location_id: profile.location_id,
                  avatar_url: profile.avatar_url,
                  banner_url: profile.banner_url,
                  display_name_visible: profile.display_name_visible,
                  username: profile.username,
                }}
                userId={userId}
                onSave={async (fields) => {
                  await updateProfile(fields);
                  setEditing(false);
                  if (onProfileUpdate) {
                    onProfileUpdate({
                      display_name: fields.display_name,
                      avatar_url: fields.avatar_url,
                    });
                  }
                }}
                onUploadAvatar={uploadAvatar}
                onUploadBanner={uploadBanner}
                onCancel={() => setEditing(false)}
                saving={saving}
              />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Banner + Avatar */}
              <div className="relative w-full aspect-[3/1] bg-black">
                <div className="w-full h-full overflow-hidden">
                  {profile?.banner_url ? (
                    <img
                      src={profile.banner_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      <span className="text-4xl md:text-5xl font-semibold tracking-tight text-primary">
                        #d.You
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar — sits on the banner bottom edge, extends downward */}
                <div className="absolute bottom-0 left-4 translate-y-1/2">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-[3px] border-background bg-muted shrink-0">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info — pad top to clear the overlapping avatar half */}
              <div className="px-4 pt-14 space-y-1">
                <div className="text-sm text-muted-foreground">
                  @{profile?.username ?? "..."}
                </div>
                <div className="text-xl font-semibold">
                  {displayName}
                </div>
                {profile?.bio && (
                  <p className="text-base text-foreground/80 pt-1">
                    {profile.bio}
                  </p>
                )}
                {profile?.pronouns && (
                  <p className="text-sm text-muted-foreground">
                    {profile.pronouns}
                  </p>
                )}
                {locationText && (
                  <p className="text-sm text-muted-foreground">
                    {locationText}
                  </p>
                )}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6">

                {/* Taste stats */}
                <div className="pt-4">
                  <ProfileStatsRow stats={tasteStats} loading={statsLoading} />
                </div>

                {/* Stats */}
                <div className="pt-3 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFollowSheet("following")}
                    className="text-sm hover:underline cursor-pointer"
                  >
                    <span className="font-semibold">{stats.followingCount}</span>{" "}
                    <span className="text-muted-foreground">following</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowSheet("followers")}
                    className="text-sm hover:underline cursor-pointer"
                  >
                    <span className="font-semibold">{stats.followerCount}</span>{" "}
                    <span className="text-muted-foreground">followers</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <Button
                    onClick={() => setEditing(true)}
                    className="w-full h-11 rounded-lg active:scale-[0.97]"
                  >
                    <Pencil size={16} className="mr-2" />
                    Edit Profile
                  </Button>
                </div>

                {/* Account Settings */}
                {userId && (
                  <div className="border-t border-border/20 pt-4 mt-4">
                    <AccountSettings />
                  </div>
                )}

                {/* Sign out */}
                <div className="pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    className="w-full h-11 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}

        </SheetContent>
      </Sheet>

      <FollowListSheet
        open={followSheet !== null}
        onClose={() => setFollowSheet(null)}
        type={followSheet ?? "followers"}
        userId={userId}
      />
    </>
  );
}
