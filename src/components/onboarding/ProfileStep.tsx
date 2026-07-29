import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Image } from "lucide-react";
import { toast } from "sonner";
import { ImageCropper } from "./ImageCropper";

interface ProfileStepProps {
  onComplete: () => void;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfileStep({ onComplete }: ProfileStepProps) {
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [showCrop, setShowCrop] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState<number>(1);
  const [cropShape, setCropShape] = useState<"round" | "rect">("round");
  const [pendingCropAction, setPendingCropAction] = useState<((blob?: Blob) => Promise<void>) | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const disabled = saving || avatarUploading || bannerUploading;

  function validateUsername(val: string): string | null {
    if (val.length > 0 && val.length < 3) return "Username must be at least 3 characters.";
    if (val.length > 30) return "Username must be at most 30 characters.";
    if (val.length > 0 && !USERNAME_RE.test(val)) return "Only letters, numbers, and underscores.";
    return null;
  }

  function handleUsernameChange(val: string) {
    setUsername(val);
    const err = validateUsername(val);
    setUsernameError(err);
    if (!err && val.length >= 3) {
      checkUsernameAvailable(val);
    }
  }

  async function checkUsernameAvailable(val: string) {
    if (!USERNAME_RE.test(val)) return;
    setIsChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", val)
      .maybeSingle();
    if (data) {
      setUsernameError("Username already taken.");
    }
    setIsChecking(false);
  }

  async function uploadFile(bucket: "avatars" | "banners", fileOrBlob: File | Blob): Promise<string> {
    const file = fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], "cropped.jpg", { type: fileOrBlob.type || "image/jpeg" });

    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("bucket", bucket);
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to upload image.");
    }

    const { url } = await res.json();
    return url;
  }

  function handleAvatarSelect(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please use JPEG, PNG, or WebP images.");
      return;
    }
    setCropImageSrc(URL.createObjectURL(file));
    setCropAspect(1);
    setCropShape("round");
    setPendingCropAction(() => async (croppedBlob?: Blob) => {
      setAvatarUploading(true);
      try {
        const blobToUpload = croppedBlob ?? file;
        if (blobToUpload.size > 5 * 1024 * 1024) {
          toast.error("File too large. Max 5MB.");
          setAvatarUploading(false);
          return;
        }
        const url = await uploadFile("avatars", blobToUpload);
        setAvatarUrl(url);
        toast.success("Profile picture updated");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to upload avatar");
      } finally {
        setAvatarUploading(false);
      }
    });
    setShowCrop(true);
  }

  function handleBannerSelect(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please use JPEG, PNG, or WebP images.");
      return;
    }
    setCropImageSrc(URL.createObjectURL(file));
    setCropAspect(3);
    setCropShape("rect");
    setPendingCropAction(() => async (croppedBlob?: Blob) => {
      setBannerUploading(true);
      try {
        const blobToUpload = croppedBlob ?? file;
        if (blobToUpload.size > 5 * 1024 * 1024) {
          toast.error("File too large. Max 5MB.");
          setBannerUploading(false);
          return;
        }
        const url = await uploadFile("banners", blobToUpload);
        setBannerUrl(url);
        toast.success("Banner updated");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to upload banner");
      } finally {
        setBannerUploading(false);
      }
    });
    setShowCrop(true);
  }

  async function handleContinue() {
    if (!USERNAME_RE.test(username)) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({
          username,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          onboarding_step: 2,
        })
        .eq("id", user.id);

      onComplete();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = USERNAME_RE.test(username) && !usernameError && !disabled;

  return (
    <div className="space-y-6 rounded-2xl border border-border/50 bg-raised/50 p-6 backdrop-blur-sm">
      <div className="space-y-2">
        <h2 className="text-[28px] font-bold text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Make it yours
        </h2>
        <p className="text-base text-muted-foreground">
          Pick a username and a look. Keep it real — or don't.
        </p>
      </div>

      {/* Banner Upload */}
      <div className="space-y-1.5">
        <div
          role="button"
          tabIndex={0}
          aria-label={bannerUploading ? "Uploading banner..." : bannerUrl ? "Change banner" : "Upload banner"}
          onClick={() => !disabled && bannerInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !disabled) {
              e.preventDefault();
              bannerInputRef.current?.click();
            }
          }}
          className={`relative w-full aspect-[3/1] rounded-lg border overflow-hidden cursor-pointer transition-colors ${
            bannerUrl ? "border-border" : "border-border border-dashed"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/5"}`}
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-1.5">
              {bannerUploading ? (
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Image size={20} className="text-muted-foreground/40" />
              )}
              <span className="text-sm text-muted-foreground">Add banner</span>
            </div>
          )}
          {bannerUploading && bannerUrl && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleBannerSelect(file);
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center gap-4">
        <div
          role="button"
          tabIndex={0}
          aria-label={avatarUploading ? "Uploading profile picture..." : avatarUrl ? "Change profile picture" : "Upload profile picture"}
          onClick={() => !disabled && avatarInputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !disabled) {
              e.preventDefault();
              avatarInputRef.current?.click();
            }
          }}
          className={`relative w-24 h-24 rounded-full shrink-0 overflow-hidden cursor-pointer transition-colors ${
            avatarUrl ? "" : "bg-white/5"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              {avatarUploading ? (
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <Camera size={20} className="text-muted-foreground/40" />
              )}
            </div>
          )}
          {avatarUploading && avatarUrl && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleAvatarSelect(file);
                e.target.value = "";
              }
            }}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Profile picture</span>
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <label htmlFor="onboarding-username" className="text-sm font-medium text-muted-foreground">
          Username
        </label>
        <input
          id="onboarding-username"
          type="text"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder="Choose a username"
          maxLength={30}
          disabled={disabled}
          className={`w-full min-h-[44px] rounded-lg px-4 bg-raised text-foreground text-base placeholder:italic placeholder:text-muted-foreground/50 border transition-colors ${
            usernameError ? "border-destructive" : "border-border"
          } disabled:opacity-50`}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />
        {usernameError ? (
          <p className="text-[13px] text-destructive" role="alert">{usernameError}</p>
        ) : isChecking ? (
          <p className="text-[13px] text-muted-foreground animate-pulse">Checking availability…</p>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            3-30 characters, letters, numbers, and underscores.
          </p>
        )}
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        className={`w-full min-h-[44px] rounded-lg font-semibold text-sm transition-all ease-out duration-200 ${
          canContinue
            ? "bg-primary text-primary-foreground scale-[1.02]"
            : "bg-primary/8 text-muted-foreground border border-border cursor-not-allowed"
        }`}
        aria-disabled={!canContinue}
      >
        {saving ? "Saving…" : "Continue"}
      </button>

      {showCrop && cropImageSrc && (
        <ImageCropper
          open={showCrop}
          imageSrc={cropImageSrc}
          aspect={cropAspect}
          cropShape={cropShape}
          onCropComplete={async (blob) => {
            setShowCrop(false);
            URL.revokeObjectURL(cropImageSrc);
            await pendingCropAction?.(blob);
          }}
          onCancel={async () => {
            setShowCrop(false);
            URL.revokeObjectURL(cropImageSrc);
            await pendingCropAction?.();
          }}
        />
      )}
    </div>
  );
}
