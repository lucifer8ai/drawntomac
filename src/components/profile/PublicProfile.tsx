import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FollowListSheet } from "./FollowListSheet";
import { CompatibleUsersList } from "../feed/CompatibleUsersList";
import { useCompatibility, getCompatibilityTier } from "@/hooks/useCompatibility";
import { useCompatibleUsers } from "@/hooks/useCompatibleUsers";

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  display_name_visible: boolean;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  pronouns: string | null;
  country: string | null;
  city: string | null;
}

interface PublicProfileProps {
  username: string;
  viewerId: string | null;
}

const TIER_COLORS: Record<string, string> = {
  Low: "bg-amber-500/15 text-amber-400",
  Medium: "bg-orange-500/15 text-orange-400",
  High: "bg-red-500/15 text-red-500",
};

export function PublicProfile({ username, viewerId }: PublicProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followSheet, setFollowSheet] = useState<"following" | "followers" | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = viewerId && profile?.id === viewerId;
  const { data: compatibility } = useCompatibility(
    isOwnProfile ? null : viewerId,
    isOwnProfile ? null : (profile?.id ?? null),
  );

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    supabase
      .from("profiles")
      .select("id, username, display_name, display_name_visible, bio, avatar_url, banner_url, pronouns, country, city")
      .eq("username", username)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("User not found");
          setLoading(false);
          return;
        }
        setProfile(data as ProfileData);
        setLoading(false);

        // Check follow status if viewer is different
        if (viewerId && data.id !== viewerId) {
          supabase
            .from("follows")
            .select("id")
            .eq("follower_id", viewerId)
            .eq("following_id", data.id)
            .maybeSingle()
            .then(({ data: followData }) => {
              setIsFollowing(!!followData);
            });
        }

        // Fetch follow counts
        Promise.all([
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", data.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", data.id),
        ]).then(([{ count: fc }, { count: fr }]) => {
          setFollowingCount(fc ?? 0);
          setFollowerCount(fr ?? 0);
        });
      });
  }, [username, viewerId]);

  async function handleFollowToggle() {
    if (!viewerId || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: profile.id });
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-muted-foreground">User not found</p>
      </div>
    );
  }

  const resolvedName = profile.display_name_visible
    ? (profile.display_name ?? profile.username)
    : profile.username;
  const locationText = profile.city && profile.country
    ? `${profile.city}, ${profile.country}`
    : profile.country ?? null;

  const tier = compatibility ? getCompatibilityTier(compatibility.sharedSongs) : null;

  return (
    <>
      <div className="flex flex-col min-h-full">
        {/* Banner */}
        <div className="relative w-full aspect-[3/1] bg-black overflow-hidden">
          {profile.banner_url ? (
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
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={resolvedName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {resolvedName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 pt-2 space-y-1">
          <div className="text-sm text-muted-foreground">
            @{profile.username}
          </div>
          {!profile.display_name_visible && profile.display_name ? (
            <div className="text-sm text-muted-foreground italic">
              Display name hidden
            </div>
          ) : (
            <div className="text-xl font-semibold">
              {profile.display_name ?? profile.username}
            </div>
          )}
          {profile.pronouns && (
            <p className="text-sm text-muted-foreground">
              {profile.pronouns}
            </p>
          )}
          {profile.bio && (
            <p className="text-base text-foreground/80 pt-1">
              {profile.bio}
            </p>
          )}
          {locationText && (
            <p className="text-sm text-muted-foreground">
              {locationText}
            </p>
          )}
        </div>

        {/* Compatibility */}
        {compatibility && compatibility.sharedSongs > 0 && (
          <div className="px-4 pt-3">
            <div className="rounded-xl border bg-raised p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Compatibility
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier ?? "Low"]}`}>
                  {tier}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-semibold">{compatibility.sharedHeard}</div>
                  <div className="text-[10px] text-muted-foreground">Heard</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-500">{compatibility.sharedLiked}</div>
                  <div className="text-[10px] text-muted-foreground">Liked</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">{compatibility.sharedDisliked}</div>
                  <div className="text-[10px] text-muted-foreground">Disliked</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 pt-3 flex gap-4">
          <button
            type="button"
            onClick={() => setFollowSheet("following")}
            className="text-sm hover:underline cursor-pointer"
          >
            <span className="font-semibold">{followingCount}</span>{" "}
            <span className="text-muted-foreground">following</span>
          </button>
          <button
            type="button"
            onClick={() => setFollowSheet("followers")}
            className="text-sm hover:underline cursor-pointer"
          >
            <span className="font-semibold">{followerCount}</span>{" "}
            <span className="text-muted-foreground">followers</span>
          </button>
        </div>

        {/* Follow/Unfollow */}
        {viewerId && !isOwnProfile && (
          <div className="px-4 pt-4">
            <Button
              onClick={handleFollowToggle}
              disabled={followLoading}
              variant={isFollowing ? "secondary" : "default"}
              className="w-full h-11 rounded-lg active:scale-[0.97]"
            >
              {followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"}
            </Button>
          </div>
        )}

        <div className="flex-1" />
      </div>

      <FollowListSheet
        open={followSheet !== null}
        onClose={() => setFollowSheet(null)}
        type={followSheet ?? "followers"}
        userId={profile.id}
      />
    </>
  );
}
