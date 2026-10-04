import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewSegmentation } from "@/lib/qa-review.functions";
import type { QaReview } from "@/lib/qa-review.server";

export const Route = createFileRoute("/_authenticated/qa-review")({
  head: () => ({
    meta: [
      { title: "AI Quality Review — SpineSeg AI" },
      {
        name: "description",
        content: "Flag likely vertebra-label and boundary errors in spinal CT segmentations with AI.",
      },
      { property: "og:title", content: "AI Quality Review — SpineSeg AI" },
      {
        property: "og:description",
        content: "AI-powered checks for vertebra labels and mask boundaries on spinal CT overlays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QaReviewPage,
});

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

const categoryLabel = { vertebra_label: "Vertebra label", boundary: "Boundary", other: "Other" };
const severityClass = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-accent/20 text-foreground",
  low: "bg-muted text-muted-foreground",
};

function Dropzone({
  label,
  value,
  onPick,
}: {
  label: string;
  value: string | null;
  onPick: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) onPick(f);
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-dashed border-border bg-surface"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
          <Upload className="size-4" /> {value ? "Replace" : "Choose"}
        </Button>
      </div>
      <div className="flex aspect-square items-center justify-center">
        {value ? (
          <img src={value} alt={label} className="size-full object-contain" />
        ) : (
          <p className="px-6 text-center text-sm text-muted-foreground">Drop an image here</p>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

function QaReviewPage() {
  const review = useServerFn(reviewSegmentation);
  const [ct, setCt] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QaReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File, set: (v: string) => void) {
    if (!file.type.startsWith("image/")) return toast.error("Please choose a PNG, JPG or WEBP image.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Please choose an image under 10 MB.");
    set(await readDataUrl(file));
    setResult(null);
  }

  async function run() {
    if (!ct || !overlay) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await review({ data: { ctImage: ct, overlayImage: overlay, context } });
      if (res.ok) setResult(res.review);
      else setError(res.error);
    } catch {
      setError("AI review failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="AI Quality Review"
      subtitle="Provide a CT slice and its segmentation overlay to flag likely vertebra-label and boundary errors."
    >
      <div className="card-soft p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <Dropzone label="CT slice" value={ct} onPick={(f) => pick(f, setCt)} />
          <Dropzone label="Segmentation overlay" value={overlay} onPick={(f) => pick(f, setOverlay)} />
        </div>
        <Textarea
          className="mt-5"
          placeholder="Optional context, e.g. 'Sagittal lumbar, labels L1–S1, 6 lumbar vertebrae suspected'"
          value={context}
          maxLength={1000}
          onChange={(e) => setContext(e.target.value)}
        />
        <Button className="mt-5 w-full" disabled={!ct || !overlay || loading} onClick={run}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Reviewing segmentation…
            </>
          ) : (
            <>
              <ShieldAlert className="size-4" /> Flag likely errors
            </>
          )}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          AI-powered decision support only. Findings must be verified by a radiologist. Do not upload identifiable
          patient information.
        </p>
      </div>

      {error ? (
        <div className="card-soft mt-6 flex items-start gap-3 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <section className="mt-8 space-y-5">
          <div className="card-soft p-6">
            <h2 className="text-base font-semibold">Overall assessment</h2>
            <p className="mt-2 text-sm">{result.overallAssessment}</p>
            {result.imageQualityNote ? (
              <p className="mt-2 text-xs text-muted-foreground">Image quality: {result.imageQualityNote}</p>
            ) : null}
          </div>
          {result.findings.length === 0 ? (
            <div className="card-soft flex items-center gap-3 p-6 text-sm">
              <CheckCircle2 className="size-5 text-primary" /> No likely label or boundary errors were flagged.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.findings.map((f, i) => (
                <article key={i} className="card-soft p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${severityClass[f.severity]}`}>
                      {f.severity}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {categoryLabel[f.category]}
                    </span>
                    <span className="ml-auto text-sm font-medium">{f.vertebra}</span>
                  </div>
                  <p className="mt-3 text-sm">{f.explanation}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Location: {f.location}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Suggested check: {f.suggestion}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
