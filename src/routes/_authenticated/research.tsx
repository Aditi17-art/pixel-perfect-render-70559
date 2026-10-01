import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/research")({
  head: () => ({
    meta: [
      { title: "Research Methodology — SpineSeg AI" },
      {
        name: "description",
        content: "Deep learning methodology behind web-based spine segmentation in CT images.",
      },
      { property: "og:title", content: "Research Methodology — SpineSeg AI" },
      {
        property: "og:description",
        content: "Encoder-decoder segmentation methodology for CT spine images.",
      },
    ],
  }),
  component: ResearchPage,
});

const sections = [
  {
    title: "Problem statement",
    body: "Manual delineation of vertebrae in CT volumes is slow and observer dependent. Automated segmentation aims to produce consistent vertebral masks that can support downstream morphometric research.",
  },
  {
    title: "Data preparation",
    body: "CT slices are windowed to a bone-friendly intensity range, resampled to a fixed resolution and normalized. Augmentation typically includes flips, small rotations, elastic deformation and intensity jitter.",
  },
  {
    title: "Model architecture",
    body: "An encoder-decoder convolutional network (U-Net family) with skip connections predicts a per-pixel probability of belonging to vertebral bone. Training commonly uses a combined Dice and cross-entropy objective.",
  },
  {
    title: "Inference pipeline",
    body: "The browser only handles upload, preview and visualization. Inference is expected to run in a separate service exposed as POST /api/segment, which returns a mask for the submitted slice.",
  },
  {
    title: "Evaluation",
    body: "Research evaluation uses overlap and distance metrics on a held-out set. No performance values are reported in this demo interface, because no trained model is connected to it.",
  },
];

function ResearchPage() {
  return (
    <AppShell
      title="Research"
      subtitle="Deep learning methodology behind web-based spine segmentation in CT images."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="card-soft p-6">
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </article>
        ))}
      </div>
      <div className="card-soft mt-6 p-6">
        <h2 className="text-base font-semibold">Reported metrics</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Research metrics such as Dice score or IoU are intentionally not shown. They will only appear once a
          trained segmentation model is connected and evaluated on a held-out dataset.
        </p>
      </div>
    </AppShell>
  );
}
