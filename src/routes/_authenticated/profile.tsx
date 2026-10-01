import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProfile, listAnalyses, updateFullName } from "@/lib/analyses";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — SpineSeg AI" },
      { name: "description", content: "Your SpineSeg AI account details and previous analyses." },
      { property: "og:title", content: "Profile — SpineSeg AI" },
      { property: "og:description", content: "Your account details and previous analyses." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: analyses } = useQuery({ queryKey: ["analyses"], queryFn: listAnalyses });
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.fullName) setFullName(profile.fullName);
  }, [profile?.fullName]);

  async function save() {
    setSaving(true);
    try {
      await updateFullName(fullName.trim());
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    } catch {
      toast.error("Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle="Your account details and research activity.">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card-soft p-6">
            <h2 className="text-base font-semibold">Personal Information</h2>
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  className="mt-1.5 h-11 bg-card"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5 h-11 bg-muted" value={profile?.email ?? ""} readOnly />
              </div>
              <div>
                <Label>Account Created</Label>
                <Input
                  className="mt-1.5 h-11 bg-muted"
                  value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ""}
                  readOnly
                />
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </section>

          <section className="card-soft p-6">
            <h2 className="text-base font-semibold">Previous analyses</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {analyses?.length
                ? `${analyses.length} analysis${analyses.length === 1 ? "" : "es"} saved to your account.`
                : "No analyses saved yet."}
            </p>
            <ul className="mt-4 divide-y divide-border">
              {(analyses ?? []).slice(0, 8).map((analysis) => (
                <li key={analysis.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm font-medium">{analysis.file_name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  );
}
