import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

function createRunIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
}

export const findingSchema = z.object({
  category: z.enum(["vertebra_label", "boundary", "other"]),
  vertebra: z.string(),
  location: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  suggestion: z.string(),
});

export const reviewSchema = z.object({
  overallAssessment: z.string(),
  imageQualityNote: z.string(),
  findings: z.array(findingSchema),
});

export type QaReview = z.infer<typeof reviewSchema>;

const SYSTEM = `You are a quality-assurance assistant for spinal CT segmentation, supporting radiologists.
You receive a CT slice and the same slice with a segmentation overlay (colored masks, possibly labeled vertebrae).
Identify LIKELY errors only:
- vertebra_label: wrong level labels (e.g. L4 labelled L5), skipped/duplicated levels, inconsistent ordering, transitional vertebra confusion.
- boundary: under-/over-segmentation, leakage into discs, ribs, soft tissue or adjacent vertebrae, missing posterior elements, merged neighbouring vertebrae, jagged or holed masks.
- other: overlay misregistration or anything else relevant to segmentation quality.
Be conservative and specific: describe location in image terms (e.g. "upper left, posterior elements"). If unlabeled, use "unlabeled" for vertebra.
Return at most 10 findings, explanations under 40 words each. If no likely errors, return an empty findings list.
This is decision support, not a diagnosis.`;

export class QaReviewError extends Error {}

export async function runQaReview(input: {
  ctImage: string;
  overlayImage: string;
  context: string;
}): Promise<QaReview> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new QaReviewError("AI review is not configured yet.");

  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: createRunIdFetch(),
  });

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      system: SYSTEM,
      output: Output.object({ schema: reviewSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Image 1: original CT slice. Image 2: segmentation overlay.${
                input.context ? `\nRadiologist context: ${input.context}` : ""
              }`,
            },
            { type: "image", image: input.ctImage },
            { type: "image", image: input.overlayImage },
          ],
        },
      ],
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    return { ...output, findings: output.findings.slice(0, 10) };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) && error.text) {
      try {
        return reviewSchema.parse(JSON.parse(error.text));
      } catch {
        throw new QaReviewError("The AI returned an unreadable review. Please try again.");
      }
    }
    if (APICallError.isInstance(error)) {
      const status = error.statusCode;
      if (status === 402) throw new QaReviewError("AI credits have run out. Add credits in workspace billing to keep reviewing.");
      if (status === 429) throw new QaReviewError("Too many reviews right now. Please wait a moment and try again.");
      if (status === 403) throw new QaReviewError("AI review is blocked for this workspace. Ask a workspace admin to check AI settings.");
      if (status === 400) throw new QaReviewError("These images could not be processed. Try smaller PNG or JPG files.");
    }
    console.error("QA review failed", error);
    throw new QaReviewError("AI review failed. Please try again later.");
  }
}
