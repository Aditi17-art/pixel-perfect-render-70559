/**
 * POST /api/segment
 *
 * Authenticated endpoint that forwards a CT image to the configured
 * segmentation model and returns the resulting mask as a PNG data URL.
 *
 * Configuration (server secrets, read inside the handler):
 * - SEGMENTATION_API_URL   — full URL of the model endpoint (multipart upload)
 * - SEGMENTATION_API_KEY   — API key sent to the model endpoint
 *
 * Contract with the model: multipart/form-data with an `image` file field;
 * the response body is the mask image (PNG). Both headers
 * `Authorization: Bearer <key>` and `x-api-key: <key>` are sent so either
 * convention works.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MODEL_TIMEOUT_MS = 120_000;

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

async function requireUser(request: Request): Promise<string> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("The server is not connected to the backend.");

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token.");

  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("Unauthorized: Invalid token.");
  return data.claims.sub;
}

async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: string; message?: string; detail?: string };
    const detail = body.error ?? body.message ?? body.detail;
    return detail ? String(detail).slice(0, 200) : undefined;
  } catch {
    return undefined;
  }
}

async function callModel(apiUrl: string, apiKey: string, image: File): Promise<Response> {
  const forward = new FormData();
  forward.append("image", image, image.name || "ct-slice.png");
  return fetch(apiUrl, {
    method: "POST",
    body: forward,
    headers: { Authorization: `Bearer ${apiKey}`, "x-api-key": apiKey },
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
}

export const Route = createFileRoute("/api/segment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireUser(request);
        } catch (error) {
          console.error("Segmentation auth failed", error);
          return jsonError(401, error instanceof Error ? error.message : "Unauthorized.");
        }

        const apiUrl = process.env["SEGMENTATION_API_URL"];
        const apiKey = process.env["SEGMENTATION_API_KEY"];
        if (!apiUrl || !apiKey) {
          return jsonError(
            503,
            "The segmentation model is not connected yet. Add the model endpoint and API key, then try again.",
          );
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonError(400, "The CT image must be sent as a multipart file upload.");
        }

        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
          return jsonError(400, "No image file was received.");
        }
        if (!image.type.startsWith("image/")) {
          return jsonError(400, "The uploaded file is not an image.");
        }
        if (image.size > MAX_IMAGE_BYTES) {
          return jsonError(413, "The image is too large (max 25 MB).");
        }

        const started = Date.now();
        let response: Response;
        try {
          response = await callModel(apiUrl, apiKey, image);
        } catch (error) {
          const timedOut = error instanceof Error && error.name === "TimeoutError";
          console.error("Segmentation model request failed", error);
          return jsonError(
            502,
            timedOut
              ? "The segmentation model took too long to respond. Please try again."
              : "Could not reach the segmentation model. Please try again later.",
          );
        }

        if (!response.ok) {
          const detail = await readErrorDetail(response);
          console.error(
            `Segmentation model returned ${response.status}`,
            detail ? `detail: ${detail}` : "no detail",
          );
          const message =
            response.status === 401 || response.status === 403
              ? "The segmentation model rejected the API key. Check the model credentials."
              : response.status === 429
                ? "The segmentation model is busy right now. Please try again in a moment."
                : response.status === 413
                  ? "The segmentation model rejected the image as too large."
                  : "The segmentation model returned an error. Please try again.";
          return jsonError(502, message);
        }

        const contentType = (response.headers.get("content-type") ?? "").split(";")[0] ?? "";
        if (!contentType.startsWith("image/")) {
          console.error("Segmentation model returned non-image response", contentType);
          return jsonError(502, "The segmentation model did not return a mask image.");
        }

        const bytes = await response.arrayBuffer();
        const mask = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
        return Response.json({ mask, durationMs: Date.now() - started });
      },
    },
  },
});
