import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FollowListSheet } from "./FollowListSheet";
import { ProfileTasteCard } from "./ProfileTasteCard";
import { useCompatibility, getCompatibilityTier } from "@/hooks/useCompatibility";
import { useProfileStats } from "@/hooks/useProfileStats";
import { toast } from "sonner";

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
  const { stats: tasteStats, loading: statsLoading, error: tasteError, retry: statsRetry } = useProfileStats(profile?.id ?? null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);

    supabase
      .from("profiles")
      .select("id, username, display_name, display_name_visible, bio, avatar_url, banner_url, pronouns, country, city")
      .eq("username", username)
      .single()
      .then(async ({ data, error: err }) => {
        if (err || !data) {
          setError("This user doesn't exist or has changed their username.");
          setLoading(false);
          return;
        }
        const profileData = data as ProfileData;
        setProfile(profileData);
        setLoading(false);

        if (viewerId && profileData.id !== viewerId) {
          const [followResult, countsResult] = await Promise.all([
            supabase.from("follows").select("id").eq("follower_id", viewerId).eq("following_id", profileData.id).maybeSingle(),
            Promise.all([
              supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
              supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
            ]),
          ]);
          setIsFollowing(!!followResult.data);
          const [{ count: fc }, { count: fr }] = countsResult;
          setFollowingCount(fc ?? 0);
          setFollowerCount(fr ?? 0);
        } else {
          const [{ count: fc }, { count: fr }] = await Promise.all([
            supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileData.id),
            supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.id),
          ]);
          setFollowingCount(fc ?? 0);
          setFollowerCount(fr ?? 0);
        }
      });
  }, [username, viewerId]);

  async function handleFollowToggle() {
    if (!viewerId || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error: delErr } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id);
        if (delErr) throw delErr;
        setIsFollowing(false);
      } else {
        const { error: insErr } = await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: profile.id });
        if (insErr) throw insErr;
        setIsFollowing(true);
      }
      const [{ count: fc }, { count: fr }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      ]);
      setFollowingCount(fc ?? 0);
      setFollowerCount(fr ?? 0);
    } catch (e: any) {
      toast.error(`Couldn't follow @${profile.username}. Try again.`);
      const { data: refetch } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", viewerId)
        .eq("following_id", profile.id)
        .maybeSingle();
      setIsFollowing(!!refetch);
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col mx-auto max-w-6xl w-full">
        <div className="w-full aspect-[16/9] md:aspect-[3/1] animate-skeleton" />
        <div className="max-w-2xl mx-auto w-full px-4">
          <div className="h-24 w-24 md:h-28 md:w-28 rounded-full animate-skeleton -mt-10 md:-mt-12 ring-2 ring-background" />
          <div className="pt-2 space-y-2">
            <div className="h-6 md:h-7 w-48 animate-skeleton rounded-lg" />
            <div className="h-4 md:h-5 w-32 animate-skeleton rounded-lg" />
          </div>
          <div className="pt-2">
            <div className="h-4 w-full animate-skeleton rounded-lg" />
            <div className="h-4 w-3/4 animate-skeleton rounded-lg mt-1.5" />
          </div>
          <div className="flex items-center justify-between py-3 border-t border-b border-border/10 mt-3">
            <div className="flex gap-4">
              <div className="h-5 w-20 animate-skeleton rounded-lg" />
              <div className="h-5 w-20 animate-skeleton rounded-lg" />
            </div>
            <div className="h-9 w-24 animate-skeleton rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-base text-muted-foreground">
          This user doesn't exist or has changed their username.
        </p>
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
      <div className="flex flex-col mx-auto max-w-6xl w-full" style={{ minHeight: "calc(100vh - 57px)" }}>
        {/* Back link — always visible since profiles open full-screen */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-medium text-white transition-colors active:bg-black/60"
          >
            ← Back
          </button>
        </div>
        {/* Banner */}
        <div className="relative w-full aspect-[16/9] md:aspect-[3/1] bg-black overflow-hidden">
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary">
                #d.You
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto w-full px-4">
          {/* Avatar */}
          <div className="-mt-10 md:-mt-12">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden ring-2 ring-background bg-muted shrink-0">
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

          {/* Name block */}
          <div className="pt-2 space-y-1">
            <div className="text-lg md:text-xl font-bold truncate">
              {resolvedName}
            </div>
            <div className="text-sm md:text-base text-muted-foreground truncate">
              @{profile.username}
            </div>
            {profile.pronouns && (
              <p className="text-sm md:text-base text-muted-foreground">
                {profile.pronouns}
              </p>
            )}
            {profile.bio && (
              <p className="text-sm md:text-base text-foreground/80 pt-1">
                {profile.bio}
              </p>
            )}
            {locationText && (
              <p className="text-sm md:text-base text-muted-foreground">
                {locationText}
              </p>
            )}
          </div>

          {/* Action bar — primary CTA */}
          <div className="flex items-center justify-between py-3 border-t border-b border-border/10 mt-3">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFollowSheet("following")}
                aria-label={`${followingCount} following`}
                className="text-sm hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-ring rounded-lg"
              >
                <span className="font-semibold tabular-nums">{followingCount}</span>{" "}
                <span className="text-muted-foreground">following</span>
              </button>
              <button
                type="button"
                onClick={() => setFollowSheet("followers")}
                aria-label={`${followerCount} followers`}
                className="text-sm hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-ring rounded-lg"
              >
                <span className="font-semibold tabular-nums">{followerCount}</span>{" "}
                <span className="text-muted-foreground">followers</span>
              </button>
            </div>
            {viewerId && !isOwnProfile && (
              <Button
                onClick={handleFollowToggle}
                disabled={followLoading}
                variant={isFollowing ? "secondary" : "default"}
                size="sm"
                aria-label={isFollowing ? `Unfollow @${profile.username}` : `Follow @${profile.username}`}
                className="rounded-lg px-5 h-9 text-sm font-medium min-w-[90px] active:scale-[0.97] transition-all duration-200"
              >
                {followLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>{isFollowing ? "Unfollowing" : "Following"}&hellip;</span>
                  </span>
                ) : isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>

          <div className="pt-2">
            <ProfileTasteCard
              stats={tasteStats}
              loading={statsLoading}
              error={tasteError}
              isOwnProfile={!!isOwnProfile}
              username={profile.username}
              onRetry={statsRetry}
            />
          </div>

          {/* Compatibility */}
          {compatibility && compatibility.sharedSongs > 0 && !isOwnProfile && (
            <div className="pt-4">
              <div className="rounded-2xl border bg-raised p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Compatibility
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier ?? "Low"]}`}>
                    {tier}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  You share {compatibility.sharedSongs} songs with @{profile.username}
                </p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold tabular-nums">{compatibility.sharedHeard}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Heard</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold tabular-nums text-[--color-like]">{compatibility.sharedLiked}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Liked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold tabular-nums">{compatibility.sharedDisliked}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Disliked</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border/20">
                  <Link
                    to="/connect/$username"
                    params={{ username: profile.username }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Explore shared music →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-[80px] md:min-h-[40px]" />
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
