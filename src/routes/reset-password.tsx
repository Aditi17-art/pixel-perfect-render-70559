import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — SpineSeg AI" },
      { name: "description", content: "Set a new password for your SpineSeg AI account." },
      { property: "og:title", content: "Choose a new password — SpineSeg AI" },
      { property: "og:description", content: "Set a new password for your SpineSeg AI account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (password.length < 8) return setError("Use at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setError("");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft px-4">
      <div className="card-soft w-full max-w-md p-7">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-gradient text-primary-foreground">
          <Activity className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter a new password for your SpineSeg AI account.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="new-password">New password</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                className="h-11 bg-card pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                className="h-11 bg-card pl-9"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
