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

  async function uploadImage(bucket: "avatars" | "banners", fileOrBlob: File | Blob): Promise<string> {
    const file = fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], "cropped.jpg", { type: fileOrBlob.type || "image/jpeg" });

    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("userId", userId!);
    formData.append("bucket", bucket);
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to upload image. Please try again.");
    }

    const { url } = await res.json();
    return url;
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

  async function uploadBanner(file: File | Blob): Promise<string> {
    return await uploadImage("banners", file);
  }

  async function uploadAvatar(file: File | Blob): Promise<string> {
    return await uploadImage("avatars", file);
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
