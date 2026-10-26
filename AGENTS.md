<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Real segmentation runs through the `POST /api/segment` server route (`src/routes/api/segment.ts`), which verifies the caller's bearer token, then forwards the image as multipart to the model endpoint configured via the `SEGMENTATION_API_URL` and `SEGMENTATION_API_KEY` secrets (read inside the handler). The client (`src/lib/segmentation.ts`) must not call the model host directly or embed any model credentials.
- If either segmentation secret is unset, `/api/segment` returns 503 with a clear "model not connected" message; the browser must never fall back to placeholder/demo masks.
