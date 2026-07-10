import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  display_name_visible: boolean;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  pronouns: string | null;
  location_id: string | null;
  country: string | null;
  city: string | null;
  updated_at: string;
}

export interface Location {
  id: string;
  country: string;
  city: string | null;
}

export interface ProfileStats {
  followingCount: number;
  followerCount: number;
}

interface ProfileUpdateFields {
  display_name?: string | null;
  bio?: string | null;
  pronouns?: string | null;
  location_id?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  display_name_visible?: boolean;
}

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ followingCount: 0, followerCount: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("id, username, display_name, display_name_visible, bio, avatar_url, banner_url, pronouns, location_id, city, country, updated_at")
        .eq("id", userId)
        .maybeSingle();
      if (err) throw err;
      setProfile(data as Profile | null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const [{ count: fc, error: fe }, { count: fr, error: ferr }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      ]);
      if (!fe && !ferr) {
        setStats({ followingCount: fc ?? 0, followerCount: fr ?? 0 });
      }
    } catch { /* non-critical */ }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  async function uploadImage(bucket: "avatars" | "banners", file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${bucket === "avatars" ? "avatar" : "banner"}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (uploadErr) throw new Error(`Storage error (${bucket}): ${uploadErr.message}`);

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrl.publicUrl;
  }

  async function updateProfile(fields: ProfileUpdateFields): Promise<void> {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (err) throw err;
      await fetchProfile();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function uploadBanner(file: File): Promise<string> {
    const url = await uploadImage("banners", file);
    await updateProfile({ banner_url: url });
    return url;
  }

  async function uploadAvatar(file: File): Promise<string> {
    const url = await uploadImage("avatars", file);
    await updateProfile({ avatar_url: url });
    return url;
  }

  return {
    profile,
    stats,
    loading,
    saving,
    error,
    refetch: fetchProfile,
    refetchStats: fetchStats,
    updateProfile,
    uploadAvatar,
    uploadBanner,
  };
}
