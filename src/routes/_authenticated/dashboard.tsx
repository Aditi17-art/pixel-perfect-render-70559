import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Images, ScanLine, ShieldCheck } from "lucide-react";

import heroImage from "@/assets/dashboard-hero.jpg";
import { AppShell, useProfile } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { listAnalyses } from "@/lib/analyses";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SpineSeg AI" },
      {
        name: "description",
        content: "Analyze CT images and visualize automated spine segmentation using deep learning.",
      },
      { property: "og:title", content: "Dashboard — SpineSeg AI" },
      {
        property: "og:description",
        content: "Analyze CT images and visualize automated spine segmentation using deep learning.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: analyses } = useQuery({ queryKey: ["analyses"], queryFn: listAnalyses });
  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <AppShell
      title="Welcome to SpineSeg AI"
      subtitle="Analyze CT images and visualize automated spine segmentation using deep learning."
    >
      <div className="card-soft relative overflow-hidden">
        <img
          src={heroImage}
          alt="CT spine with segmentation contours"
          width={1600}
          height={640}
          className="h-44 w-full object-cover sm:h-56"
        />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-10">
          <p className="max-w-sm font-display text-lg font-semibold sm:text-xl">
            {firstName ? `Good to see you, ${firstName}.` : "Automated vertebra segmentation"}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground sm:text-sm">
            {analyses?.length
              ? `${analyses.length} analysis${analyses.length === 1 ? "" : "es"} stored in your account.`
              : "Upload your first CT slice to see the segmentation workflow end to end."}
          </p>
          <Button asChild size="sm" className="mt-2 w-fit">
            <Link to="/segmentation">Start Segmentation</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Card
          icon={<ScanLine className="size-5" />}
          title="Upload CT Scan"
          body="Upload and analyze a new CT image."
          action={
            <Button asChild size="sm" className="w-full">
              <Link to="/segmentation">Start Segmentation</Link>
            </Button>
          }
        />
        <Card
          icon={<Images className="size-5" />}
          title="Previous Results"
          body="View previously processed images."
          action={
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/results">Open results</Link>
            </Button>
          }
        />
        <Card
          icon={<BookOpen className="size-5" />}
          title="Research"
          body="Learn about the deep learning methodology."
          action={
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/research">Read methodology</Link>
            </Button>
          }
        />
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium">Privacy Notice</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploaded images are intended for research and educational purposes. Do not upload personally
            identifiable medical information.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function Card({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="card-soft flex flex-col p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        {icon}
      </span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-5">{action}</div>
    </div>
  );
}
