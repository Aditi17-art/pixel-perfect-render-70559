/**
 * Segmentation API adapter.
 *
 * The frontend never contains the deep-learning model. When a real inference
 * service is available, set VITE_SEGMENTATION_ENDPOINT (default "/api/segment")
 * and flip VITE_SEGMENTATION_MODE to "remote": the same call signature is used.
 * Until then a deterministic demo mask is produced in the browser so the
 * interface can be reviewed end to end.
 */

export type SegmentationResult = {
  /** PNG data URL of the segmentation mask (transparent background). */
  maskDataUrl: string;
  /** Milliseconds spent producing the mask. */
  durationMs: number;
  mode: "demo" | "remote";
};

const ENDPOINT = (import.meta.env["VITE_SEGMENTATION_ENDPOINT"] as string) ?? "/api/segment";
const MODE = (import.meta.env["VITE_SEGMENTATION_MODE"] as string) ?? "demo";

export async function segmentCtImage(file: File): Promise<SegmentationResult> {
  const started = performance.now();

  if (MODE === "remote") {
    const body = new FormData();
    body.append("image", file);
    const response = await fetch(ENDPOINT, { method: "POST", body });
    if (!response.ok) throw new Error("Segmentation service returned an error.");
    const payload = (await response.json()) as { mask: string };
    return {
      maskDataUrl: payload.mask,
      durationMs: performance.now() - started,
      mode: "remote",
    };
  }

  const maskDataUrl = await buildDemoMask(file);
  return { maskDataUrl, durationMs: performance.now() - started, mode: "demo" };
}

/**
 * Demo mask: highlights the brightest connected structures near the vertical
 * mid-band of the image, which is where vertebrae usually sit in CT slices.
 * This is an illustrative placeholder, not a clinical result.
 */
async function buildDemoMask(file: File): Promise<string> {
  const bitmap = await loadImage(file);
  const width = Math.min(bitmap.width, 768);
  const scale = width / bitmap.width;
  const height = Math.round(bitmap.height * scale);

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sctx = source.getContext("2d");
  if (!sctx) throw new Error("Canvas is not available in this browser.");
  sctx.drawImage(bitmap, 0, 0, width, height);
  const pixels = sctx.getImageData(0, 0, width, height);

  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext("2d");
  if (!mctx) throw new Error("Canvas is not available in this browser.");
  const out = mctx.createImageData(width, height);

  let sum = 0;
  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    const r = pixels.data[i * 4] ?? 0;
    const g = pixels.data[i * 4 + 1] ?? 0;
    const b = pixels.data[i * 4 + 2] ?? 0;
    const v = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[i] = v;
    sum += v;
  }
  const mean = sum / luma.length;
  const threshold = Math.max(120, mean * 1.35);

  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const dx = (x - cx) / (width * 0.28);
      const dy = (y - cy) / (height * 0.62);
      const inBand = dx * dx + dy * dy < 1;
      const bright = (luma[i] ?? 0) > threshold;
      if (inBand && bright) {
        out.data[i * 4] = 32;
        out.data[i * 4 + 1] = 178;
        out.data[i * 4 + 2] = 196;
        out.data[i * 4 + 3] = 210;
      } else {
        out.data[i * 4 + 3] = 0;
      }
    }
  }

  mctx.putImageData(out, 0, 0);
  return mask.toDataURL("image/png");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header?.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
