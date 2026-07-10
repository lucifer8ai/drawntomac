import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProfileEditForm } from "./ProfileEditForm";
import { FollowListSheet } from "./FollowListSheet";
import { useProfile } from "@/hooks/useProfile";
import { LogOut, Pencil } from "lucide-react";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSheet({ open, onClose }: ProfileSheetProps) {
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
          className="w-full sm:max-w-sm p-0 overflow-y-auto"
        >
          {loading && !profile ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : editing && userId && profile ? (
            <div className="relative">
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
                }}
                onUploadAvatar={uploadAvatar}
                onUploadBanner={uploadBanner}
                onCancel={() => setEditing(false)}
                saving={saving}
              />
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              {/* Banner */}
              <div className="relative w-full aspect-[3/1] bg-black overflow-hidden">
                {profile?.banner_url ? (
                  <img
                    src={profile.banner_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <span className="text-4xl md:text-5xl font-['Instrument_Serif'] italic text-primary">
                      #d.You
                    </span>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="px-4 -mt-12">
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

              {/* Info */}
              <div className="px-4 pt-2 space-y-1">
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

              {/* Stats */}
              <div className="px-4 pt-3 flex gap-4">
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
              <div className="px-4 pt-4 space-y-2 mb-4">
                <Button
                  onClick={() => setEditing(true)}
                  className="w-full h-11 rounded-lg active:scale-[0.97]"
                >
                  <Pencil size={16} className="mr-2" />
                  Edit Profile
                </Button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Sign out */}
              <div className="px-4 pb-6">
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
