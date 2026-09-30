import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SpineSeg AI" },
      {
        name: "description",
        content: "Sign in or create an account to use the SpineSeg AI research platform.",
      },
      { property: "og:title", content: "Sign in — SpineSeg AI" },
      {
        property: "og:description",
        content: "Access AI-powered spine segmentation for CT images.",
      },
    ],
  }),
  component: () => <AuthScreen />,
});
