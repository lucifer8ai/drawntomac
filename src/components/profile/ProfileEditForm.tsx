import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { BannerUpload } from "./BannerUpload";
import { AvatarUpload } from "./AvatarUpload";
import { LocationPicker } from "./LocationPicker";
import { toast } from "sonner";

interface EditFormProps {
  initial: {
    display_name: string | null;
    bio: string | null;
    pronouns: string | null;
    location_id: string | null;
    avatar_url: string | null;
    banner_url: string | null;
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
  const [locationId, setLocationId] = useState<string | null>(initial.location_id);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(initial.banner_url);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [passSaving, setPassSaving] = useState(false);

  async function fetchEmail() {
    const { data } = await supabase.auth.getUser();
    setCurrentEmail(data.user?.email ?? "");
  }

  async function handleSave() {
    await onSave({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      pronouns: pronouns.trim() || null,
      location_id: locationId,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
    });
  }

  async function handleBannerUpload(file: File) {
    const url = await onUploadBanner(file);
    setBannerUrl(url);
  }

  async function handleAvatarUpload(file: File) {
    const url = await onUploadAvatar(file);
    setAvatarUrl(url);
  }

  async function handleEmailChange() {
    if (!newEmail) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast.success("Check your new email to confirm the change.");
      setNewEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change email.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePassChange() {
    if (!newPass || newPass !== confirmPass) {
      toast.error("Passwords do not match.");
      return;
    }
    setPassSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast.success("Password changed.");
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change password.");
    } finally {
      setPassSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <BannerUpload
        bannerUrl={bannerUrl}
        onUpload={handleBannerUpload}
        disabled={saving}
      />

      <div className="px-4 -mt-12">
        <AvatarUpload
          avatarUrl={avatarUrl}
          onUpload={handleAvatarUpload}
          disabled={saving}
          displayName={displayName || initial.username}
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

        {/* Email section */}
        <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
          <CollapsibleTrigger
            onClick={() => !emailOpen && fetchEmail()}
            className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-foreground/80 transition-colors"
          >
            <ChevronDown
              size={16}
              className={`transition-transform ${emailOpen ? "rotate-180" : ""}`}
            />
            Change Email
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {currentEmail && (
              <p className="text-xs text-muted-foreground">
                Current: {currentEmail}
              </p>
            )}
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email address"
              className="h-11 rounded-lg"
            />
            <Button
              variant="secondary"
              onClick={handleEmailChange}
              disabled={emailSaving || !newEmail}
              className="rounded-lg w-full"
            >
              {emailSaving ? "Sending..." : "Change Email"}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Password section */}
        <Collapsible open={passOpen} onOpenChange={setPassOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-foreground/80 transition-colors">
            <ChevronDown
              size={16}
              className={`transition-transform ${passOpen ? "rotate-180" : ""}`}
            />
            Change Password
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New password"
              className="h-11 rounded-lg"
            />
            <Input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm new password"
              className="h-11 rounded-lg"
            />
            <Button
              variant="secondary"
              onClick={handlePassChange}
              disabled={passSaving || !newPass || !confirmPass}
              className="rounded-lg w-full"
            >
              {passSaving ? "Saving..." : "Change Password"}
            </Button>
          </CollapsibleContent>
        </Collapsible>
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
