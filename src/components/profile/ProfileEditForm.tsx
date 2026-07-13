import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BannerUpload } from "./BannerUpload";
import { AvatarUpload } from "./AvatarUpload";
import { LocationPicker } from "./LocationPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditFormProps {
  initial: {
    display_name: string | null;
    bio: string | null;
    pronouns: string | null;
    location_id: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    display_name_visible: boolean;
    username: string;
  };
  userId: string;
  onSave: (fields: {
    display_name?: string | null;
    bio?: string | null;
    pronouns?: string | null;
    location_id?: string | null;
    avatar_url?: string | null;
    banner_url?: string | null;
    display_name_visible?: boolean;
  }) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string>;
  onUploadBanner: (file: File) => Promise<string>;
  onCancel: () => void;
  saving: boolean;
}

export function ProfileEditForm({
  initial,
  userId,
  onSave,
  onUploadAvatar,
  onUploadBanner,
  onCancel,
  saving,
}: EditFormProps) {
  const [displayName, setDisplayName] = useState(initial.display_name ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [bioCount, setBioCount] = useState((initial.bio ?? "").length);
  const [pronouns, setPronouns] = useState(initial.pronouns ?? "");
  const [displayNameVisible, setDisplayNameVisible] = useState(initial.display_name_visible ?? true);
  const [locationId, setLocationId] = useState<string | null>(initial.location_id);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(initial.banner_url);

  async function handleSave() {
    await onSave({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      pronouns: pronouns.trim() || null,
      location_id: locationId,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      display_name_visible: displayNameVisible,
    });
  }

  async function handleBannerUpload(file: File) {
    try {
      const url = await onUploadBanner(file);
      setBannerUrl(url);
      toast.success("Banner updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to upload banner");
    }
  }

  async function handleAvatarUpload(file: File) {
    try {
      const url = await onUploadAvatar(file);
      setAvatarUrl(url);
      toast.success("Avatar updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to upload avatar");
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <BannerUpload
        bannerUrl={bannerUrl}
        onUpload={handleBannerUpload}
        disabled={saving}
        onRemove={async () => {
          try {
            const { data: session } = await supabase.auth.getSession();
            if (session.session?.access_token) {
              await fetch(
                `/api/upload?userId=${userId}&bucket=banners`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${session.session.access_token}` },
                },
              );
            }
          } catch { /* best-effort */ }
          setBannerUrl(null);
          toast.success("Banner removed");
        }}
      />

      <div className="px-4 -mt-12">
        <AvatarUpload
          avatarUrl={avatarUrl}
          onUpload={handleAvatarUpload}
          disabled={saving}
          displayName={displayName || initial.username}
          onRemove={async () => {
            try {
              const { data: session } = await supabase.auth.getSession();
              if (session.session?.access_token) {
                await fetch(
                  `/api/upload?userId=${userId}&bucket=avatars`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${session.session.access_token}` },
                  },
                );
              }
            } catch { /* best-effort */ }
            setAvatarUrl(null);
            toast.success("Avatar removed");
          }}
        />
      </div>

      <div className="px-4 space-y-4">
        <div>
          <Label className="text-sm font-medium">Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder={initial.username}
            className="h-11 rounded-lg mt-1.5"
          />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {displayName.length}/50
          </div>
          <div className="flex items-center justify-between mt-2">
            <Label htmlFor="show-display-name" className="text-sm text-muted-foreground cursor-pointer">
              Show display name on my public profile
            </Label>
            <Switch
              id="show-display-name"
              checked={displayNameVisible}
              onCheckedChange={setDisplayNameVisible}
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setBioCount(e.target.value.length);
            }}
            maxLength={300}
            placeholder="Tell people about yourself..."
            className="rounded-lg mt-1.5 resize-none min-h-[80px]"
          />
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {bioCount}/300
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Pronouns</Label>
          <Input
            value={pronouns}
            onChange={(e) => setPronouns(e.target.value)}
            placeholder="e.g. they/them, she/her, he/him"
            className="h-11 rounded-lg mt-1.5"
          />
        </div>

        <LocationPicker value={locationId} onChange={setLocationId} />
      </div>

      <div className="flex gap-3 px-4 pb-6 pt-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-11 rounded-lg active:scale-[0.97]"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
