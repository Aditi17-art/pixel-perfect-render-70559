import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX = 14_000_000; // ~10 MB image as data URL
const dataUrl = z
  .string()
  .max(MAX, "Image is too large (max ~10 MB).")
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, "Use a PNG, JPG or WEBP image.");

export const reviewSegmentation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ ctImage: dataUrl, overlayImage: dataUrl, context: z.string().max(1000) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { runQaReview } = await import("./qa-review.server");
    try {
      return { ok: true as const, review: await runQaReview(data) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "AI review failed." };
    }
  });
