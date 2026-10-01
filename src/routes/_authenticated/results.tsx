import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SegmentationViewer } from "@/components/SegmentationViewer";
import { AnalysisSummary } from "./segmentation";
import { Button } from "@/components/ui/button";
import { deleteAnalysis, listAnalyses, signedUrl, type Analysis } from "@/lib/analyses";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({
    meta: [
      { title: "Segmentation Results — SpineSeg AI" },
      {
        name: "description",
        content: "Review the original CT image, the segmentation mask and the overlay for past analyses.",
      },
      { property: "og:title", content: "Segmentation Results — SpineSeg AI" },
      {
        property: "og:description",
        content: "Review original CT, segmentation mask and overlay for saved analyses.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const queryClient = useQueryClient();
  const { data: analyses, isLoading } = useQuery({ queryKey: ["analyses"], queryFn: listAnalyses });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = analyses?.find((a) => a.id === selectedId) ?? analyses?.[0] ?? null;

  const { data: urls } = useQuery({
    queryKey: ["analysis-urls", selected?.id],
    queryFn: async () => ({
      original: await signedUrl(selected?.original_path ?? null),
      mask: await signedUrl(selected?.mask_path ?? null),
    }),
    enabled: Boolean(selected),
  });

  useEffect(() => {
    if (!selectedId && analyses?.length) setSelectedId(analyses[0]!.id);
  }, [analyses, selectedId]);

  async function remove(analysis: Analysis) {
    try {
      await deleteAnalysis(analysis);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Analysis deleted");
    } catch {
      toast.error("Could not delete that analysis.");
    }
  }

  return (
    <AppShell
      title="Segmentation Results"
      subtitle="Every analysis saved to your account, with the original CT image, mask and overlay."
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your analyses…
        </div>
      ) : !analyses?.length ? (
        <div className="card-soft p-10 text-center">
          <p className="text-base font-semibold">No analyses yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Upload a CT image to generate your first segmentation result.
          </p>
          <Button asChild className="mt-5">
            <Link to="/segmentation">Start Segmentation</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="card-soft h-fit divide-y divide-border overflow-hidden">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className={`flex items-center gap-2 px-4 py-3 ${
                  selected?.id === analysis.id ? "bg-accent/60" : ""
                }`}
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(analysis.id)}>
                  <p className="truncate text-sm font-medium">{analysis.file_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleString()}
                  </p>
                </button>
                <button
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Delete ${analysis.file_name}`}
                  onClick={() => remove(analysis)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </aside>

          <div>
            {selected && urls?.original ? (
              <>
                <SegmentationViewer
                  originalUrl={urls.original}
                  maskUrl={urls.mask}
                  fileName={selected.file_name}
                />
                <AnalysisSummary />
              </>
            ) : (
              <div className="card-soft flex items-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Preparing images…
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
