import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef } from "react";

interface ThumbnailCanvasProps {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;
  isActive: boolean;
  onClick: () => void;
  ocid: string;
}

export function ThumbnailCanvas({
  pdfDoc,
  pageIndex,
  isActive,
  onClick,
  ocid,
}: ThumbnailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    pdfDoc.getPage(pageIndex + 1).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 0.2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      page.render({ canvas, viewport }).promise.catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex]);

  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-md transition-all cursor-pointer w-full ${
        isActive ? "bg-primary/20 ring-1 ring-primary" : "hover:bg-accent"
      }`}
    >
      <div
        className={`rounded overflow-hidden border ${
          isActive ? "border-primary" : "border-border"
        }`}
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
      >
        <canvas
          ref={canvasRef}
          className="block max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <span className="text-xs font-mono-code text-muted-foreground">
        {pageIndex + 1}
      </span>
    </button>
  );
}
