/**
 * Segmentation API adapter.
 *
 * The deep-learning model itself is never in the browser or this bundle:
 * uploads go to the app's own POST /api/segment server route, which forwards
 * the image to the configured model endpoint and returns the mask as a PNG
 * data URL. The model's URL and API key live in server-side secrets
 * (SEGMENTATION_API_URL / SEGMENTATION_API_KEY).
 */
import { supabase } from "@/integrations/supabase/client";

export type SegmentationResult = {
  /** PNG data URL of the segmentation mask (transparent background). */
  maskDataUrl: string;
  /** Milliseconds spent producing the mask, including round-trip. */
  durationMs: number;
  mode: "model";
};

const ENDPOINT = "/api/segment";

export async function segmentCtImage(file: File): Promise<SegmentationResult> {
  const started = performance.now();

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired. Please sign in again.");

  const body = new FormData();
  body.append("image", file);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    body,
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = (await response.json().catch(() => null)) as
    | { mask?: string; error?: string }
    | null;
  if (!response.ok || !payload?.mask) {
    throw new Error(payload?.error ?? "Segmentation failed. Please try again.");
  }

  return {
    maskDataUrl: payload.mask,
    durationMs: performance.now() - started,
    mode: "model",
  };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header?.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
