import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Loader2, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SegmentationViewer } from "@/components/SegmentationViewer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dataUrlToBlob, segmentCtImage } from "@/lib/segmentation";

export const Route = createFileRoute("/_authenticated/segmentation")({
  head: () => ({
    meta: [
      { title: "Segmentation — SpineSeg AI" },
      {
        name: "description",
        content: "Upload a CT image and run automated spine segmentation with a deep learning model.",
      },
      { property: "og:title", content: "Segmentation — SpineSeg AI" },
      {
        property: "og:description",
        content: "Upload a CT image and run automated spine segmentation.",
      },
    ],
  }),
  component: SegmentationPage,
});

type Stage = "idle" | "processing" | "done";

function SegmentationPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [step, setStep] = useState("");

  function pick(selected: File | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG or BMP export of a CT slice).");
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      toast.error("Please choose a file under 25 MB.");
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setMaskUrl(null);
    setDurationMs(null);
    setStage("idle");
  }

  async function analyze() {
    if (!file) return;
    setStage("processing");
    try {
      setStep("Running segmentation model…");
      const result = await segmentCtImage(file);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");

      const stamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const originalPath = `${userId}/${stamp}-original-${safeName}`;
      const maskPath = `${userId}/${stamp}-mask.png`;

      setStep("Saving results to your account…");
      const upOriginal = await supabase.storage.from("ct-scans").upload(originalPath, file);
      if (upOriginal.error) throw upOriginal.error;
      const upMask = await supabase.storage
        .from("ct-scans")
        .upload(maskPath, dataUrlToBlob(result.maskDataUrl), { contentType: "image/png" });
      if (upMask.error) throw upMask.error;

      const insert = await supabase.from("analyses").insert({
        user_id: userId,
        file_name: file.name,
        original_path: originalPath,
        mask_path: maskPath,
        status: "completed",
        notes: "Model segmentation",
      });
      if (insert.error) throw insert.error;

      setMaskUrl(result.maskDataUrl);
      setDurationMs(result.durationMs);
      setStage("done");
      await queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Segmentation completed and saved");
    } catch (error) {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : "Segmentation failed. Please try again.");
    } finally {
      setStep("");
    }
  }

  return (
    <AppShell
      title="Segmentation"
      subtitle="Upload a CT image, run the segmentation model, and review the mask and overlay."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card-soft p-6">
          <h2 className="text-base font-semibold">Upload CT Scan</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Supported: PNG, JPG or BMP exports of a CT slice, up to 25 MB.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0]);
            }}
            className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center"
          >
            <Upload className="size-6 text-primary" />
            <p className="mt-3 text-sm font-medium">Drag and drop a CT image here</p>
            <p className="mt-1 text-xs text-muted-foreground">or browse from your computer</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {file ? <p className="mt-4 text-xs text-muted-foreground">Selected: {file.name}</p> : null}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Privacy Notice</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Uploaded images are intended for research and educational purposes. Do not upload personally
                identifiable medical information.
              </p>
            </div>
          </div>

          <Button className="mt-5 w-full" onClick={analyze} disabled={!file || stage === "processing"}>
            {stage === "processing" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {step || "Analyzing…"}
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Analyze CT Scan
              </>
            )}
          </Button>
        </div>

        <div className="card-soft flex flex-col p-6">
          <h2 className="text-base font-semibold">Preview</h2>
          <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-surface">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected CT slice" className="max-h-80 w-full object-contain" />
            ) : (
              <p className="px-6 py-16 text-center text-sm text-muted-foreground">
                Your selected CT image appears here.
              </p>
            )}
          </div>
          {stage === "processing" ? (
            <div className="mt-4 space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-accent-gradient" />
              </div>
              <p className="text-xs text-muted-foreground">{step}</p>
            </div>
          ) : null}
        </div>
      </div>

      {stage === "done" && previewUrl ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Segmentation Results</h2>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/results" })}>
              View all results
            </Button>
          </div>
          <div className="mt-5">
            <SegmentationViewer
              originalUrl={previewUrl}
              maskUrl={maskUrl}
              fileName={file?.name ?? "ct-scan.png"}
            />
          </div>
          <AnalysisSummary durationMs={durationMs ?? undefined} />
        </section>
      ) : null}
    </AppShell>
  );
}

export function AnalysisSummary({ durationMs }: { durationMs?: number | undefined }) {
  const rows: [string, string][] = [
    ["Status", "Segmentation Completed"],
    ["Model", "SpineSeg Segmentation Model"],
    [
      "Processing Time",
      durationMs != null ? `${(durationMs / 1000).toFixed(1)} s` : "—",
    ],
    ["Research Metrics", "Available once ground-truth labels are provided"],
  ];
  return (
    <div className="card-soft mt-6 p-6">
      <h3 className="text-base font-semibold">Analysis Summary</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
