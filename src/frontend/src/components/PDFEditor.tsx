import { useEditorStore } from "@/store/editorStore";
import { exportEditedPdf } from "@/utils/pdfUtils";
import { AlertCircle, FileText, Loader2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EditorCanvas } from "./EditorCanvas";
import { Sidebar } from "./Sidebar";

// Setup pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const SCALE = 1.5;

interface PDFEditorProps {
  onDocumentLoaded?: (
    filename: string,
    pageCount: number,
    bytes: Uint8Array,
  ) => void;
}

export function PDFEditor({ onDocumentLoaded }: PDFEditorProps) {
  const { currentPage, totalPages, zoom, initPages, pages } = useEditorStore();
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Rendered page canvases (base)
  const baseCanvasesRef = useRef<Array<HTMLCanvasElement | null>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefsForExport = useRef<Array<HTMLCanvasElement | null>>([]);

  const renderPage = useCallback(
    async (
      doc: PDFDocumentProxy,
      pageNum: number,
    ): Promise<HTMLCanvasElement> => {
      const page = await doc.getPage(pageNum + 1);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas;
    },
    [],
  );

  const renderAllPages = useCallback(
    async (doc: PDFDocumentProxy) => {
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < doc.numPages; i++) {
        const canvas = await renderPage(doc, i);
        canvases.push(canvas);
      }
      baseCanvasesRef.current = canvases;
    },
    [renderPage],
  );

  async function loadPDF(file: File) {
    setLoading(true);
    setError(null);
    try {
      const ab = await file.arrayBuffer();
      const bytes = new Uint8Array(ab);
      setOriginalBytes(bytes);
      setFilename(file.name);
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPdfDoc(doc);
      await renderAllPages(doc);
      initPages(doc.numPages);
      onDocumentLoaded?.(file.name, doc.numPages, bytes);
      toast.success(`Loaded: ${file.name} (${doc.numPages} pages)`);
    } catch {
      setError(
        "Failed to load PDF. The file may be corrupted or password-protected.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") loadPDF(file);
    else toast.error("Please drop a PDF file");
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadPDF(file);
  }

  async function exportPdf() {
    if (!originalBytes) return;
    // Collect rendered canvases per page
    const exportCanvases = pageRefsForExport.current;
    await exportEditedPdf(originalBytes, pages, exportCanvases, filename);
    toast.success("PDF exported!");
  }

  // Expose export function
  useEffect(() => {
    (window as any).__pdfExport = exportPdf;
  });

  const renderThumbnails = useCallback(
    (canvas: HTMLCanvasElement, idx: number) => {
      const base = baseCanvasesRef.current[idx];
      if (!base) return;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0, canvas.width, canvas.height);
    },
    [],
  );

  if (!pdfDoc) {
    return (
      <div
        className={`flex-1 flex items-center justify-center transition-colors ${
          isDragOver ? "bg-primary/10" : "bg-background"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        data-ocid="pdf.dropzone"
      >
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-3"
              data-ocid="pdf.loading_state"
            >
              <Loader2
                className="animate-spin text-primary mx-auto"
                size={40}
              />
              <p className="text-muted-foreground">Loading PDF...</p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-3 max-w-sm"
              data-ocid="pdf.error_state"
            >
              <AlertCircle className="text-destructive mx-auto" size={40} />
              <p className="text-destructive">{error}</p>
              <label className="cursor-pointer">
                <span className="text-primary text-sm underline">
                  Try another file
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="relative">
                <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                  <FileText size={56} className="text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Drop a PDF here</h2>
                <p className="text-sm text-muted-foreground">
                  or click to browse your files
                </p>
              </div>
              <label
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
                data-ocid="pdf.upload_button"
              >
                <Upload size={18} /> Open PDF
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // pdfDoc used for page count
  const pageWidth =
    ((baseCanvasesRef.current[currentPage]?.width || 595) * zoom) / SCALE;
  const pageHeight =
    ((baseCanvasesRef.current[currentPage]?.height || 842) * zoom) / SCALE;

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar renderThumbnails={renderThumbnails} />

      <div
        className="flex-1 overflow-auto bg-[oklch(0.09_0.01_260)] p-4"
        ref={containerRef}
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={`page-idx-${i}`}
              className="relative shadow-2xl"
              style={{ width: pageWidth, height: pageHeight }}
            >
              <EditorCanvas
                baseCanvas={baseCanvasesRef.current[i]}
                pageIndex={i}
                width={pageWidth}
                height={pageHeight}
                zoom={zoom}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
