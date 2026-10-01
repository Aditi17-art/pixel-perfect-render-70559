import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell, useProfile } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SpineSeg AI" },
      { name: "description", content: "Manage your SpineSeg AI account security and session." },
      { property: "og:title", content: "Settings — SpineSeg AI" },
      { property: "og:description", content: "Manage your account security and session." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword() {
    if (newPassword.length < 8) return toast.error("Use at least 8 characters.");
    if (newPassword !== confirm) return toast.error("New passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
    } as Parameters<typeof supabase.auth.updateUser>[0]);
    setSaving(false);
    if (error) return toast.error(error.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    toast.success("Password updated");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings" subtitle="Account security and session preferences.">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-soft p-6">
          <h2 className="text-base font-semibold">Change password</h2>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="current">Current password</Label>
              <Input
                id="current"
                type="password"
                className="mt-1.5 h-11 bg-card"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                className="mt-1.5 h-11 bg-card"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input
                id="confirm"
                type="password"
                className="mt-1.5 h-11 bg-card"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button onClick={changePassword} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
            </Button>
          </div>
        </section>

        <section className="card-soft p-6">
          <h2 className="text-base font-semibold">Session</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{profile?.email}</span>.
          </p>
          <Button variant="outline" className="mt-5" onClick={signOut}>
            Logout
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
