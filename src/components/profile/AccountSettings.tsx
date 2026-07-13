import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function AccountSettings() {
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
    <div className="space-y-3">
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
  );
}
