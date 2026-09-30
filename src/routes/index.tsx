import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Login or Sign Up — SpineSeg AI" },
      {
        name: "description",
        content:
          "Sign in to SpineSeg AI to analyze CT images and visualize automated spine segmentation using deep learning.",
      },
      { property: "og:title", content: "Login or Sign Up — SpineSeg AI" },
      {
        property: "og:description",
        content: "Web-Based Spine Segmentation Using Deep Learning in CT Images.",
      },
    ],
  }),
  component: () => <AuthScreen />,
});
