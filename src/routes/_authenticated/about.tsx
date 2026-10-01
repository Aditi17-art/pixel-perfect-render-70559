import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "About — SpineSeg AI" },
      {
        name: "description",
        content: "About SpineSeg AI, a research platform for web-based spine segmentation in CT images.",
      },
      { property: "og:title", content: "About — SpineSeg AI" },
      {
        property: "og:description",
        content: "A university research platform for AI-assisted spine segmentation.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell title="About" subtitle="Web-Based Spine Segmentation Using Deep Learning in CT Images.">
      <div className="grid gap-5 md:grid-cols-2">
        <article className="card-soft p-6">
          <h2 className="text-base font-semibold">The project</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            SpineSeg AI is a research and educational platform that demonstrates how an automated spine
            segmentation workflow can be delivered in the browser: upload a CT slice, run segmentation, and
            review the original image, mask and overlay side by side.
          </p>
        </article>
        <article className="card-soft p-6">
          <h2 className="text-base font-semibold">How it is built</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The interface is a React and TypeScript application. Accounts, stored analyses and image storage run
            on the app's own secure backend, so each researcher only ever sees their own uploads.
          </p>
        </article>
        <article className="card-soft p-6">
          <h2 className="text-base font-semibold">Model independence</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            No deep-learning model runs in the browser. The segmentation call is isolated behind a single
            adapter, so a trained model served at POST /api/segment can be connected without touching the
            interface.
          </p>
        </article>
        <article className="card-soft p-6">
          <h2 className="text-base font-semibold">Research Disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This platform is intended for research and educational purposes only. It is not a medical diagnostic
            tool and should not be used for clinical diagnosis or treatment decisions.
          </p>
        </article>
      </div>
    </AppShell>
  );
}
