import { useRef, useState } from "react";
import { Download, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function SegmentationViewer({
  originalUrl,
  maskUrl,
  fileName,
}: {
  originalUrl: string;
  maskUrl: string | null;
  fileName: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [opacity, setOpacity] = useState(55);
  const overlayRef = useRef<HTMLDivElement>(null);

  function fullscreen() {
    const node = overlayRef.current;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen?.();
  }

  const panes = [
    { label: "Original CT", layers: [{ src: originalUrl, opacity: 1 }] },
    maskUrl
      ? {
          label: "Segmentation Mask",
          layers: [{ src: maskUrl, opacity: 1 }],
        }
      : null,
    maskUrl
      ? {
          label: "Overlay",
          layers: [
            { src: originalUrl, opacity: 1 },
            { src: maskUrl, opacity: opacity / 100 },
          ],
        }
      : null,
  ].filter(Boolean) as { label: string; layers: { src: string; opacity: number }[] }[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
          <ZoomIn className="size-4" /> Zoom In
        </Button>
        <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
          <ZoomOut className="size-4" /> Zoom Out
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setZoom(1);
            setOpacity(55);
          }}
        >
          <RotateCcw className="size-4" /> Reset
        </Button>
        <Button variant="outline" size="sm" onClick={fullscreen}>
          <Maximize2 className="size-4" /> Fullscreen
        </Button>
        {maskUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={maskUrl} download={`${fileName.replace(/\.[^.]+$/, "")}-mask.png`}>
              <Download className="size-4" /> Download result
            </a>
          </Button>
        ) : null}

        {maskUrl ? (
          <div className="ml-auto flex min-w-56 items-center gap-3">
            <span className="whitespace-nowrap text-xs text-muted-foreground">Overlay opacity</span>
            <Slider value={[opacity]} min={0} max={100} step={1} onValueChange={(v) => setOpacity(v[0] ?? 0)} />
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{opacity}%</span>
          </div>
        ) : null}
      </div>

      <div ref={overlayRef} className="grid gap-5 bg-background md:grid-cols-3">
        {panes.map((pane) => (
          <figure key={pane.label} className="card-soft overflow-hidden">
            <figcaption className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {pane.label}
            </figcaption>
            <div className="relative aspect-square overflow-hidden bg-surface">
              <div
                className="absolute inset-0 transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              >
                {pane.layers.map((layer, i) => (
                  <img
                    key={i}
                    src={layer.src}
                    alt={pane.label}
                    loading="lazy"
                    className="absolute inset-0 size-full object-contain"
                    style={{ opacity: layer.opacity }}
                  />
                ))}
              </div>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
