import type {
  EraseElement,
  ImageElement,
  OverlayElement,
  PageNativeDimensions,
  TextElement,
  ToolType,
} from "@/types/pdf";
import {
  AlertCircle,
  FileText,
  GripVertical,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { PDFSidebar } from "./PDFSidebar";
import { PDFToolbar } from "./PDFToolbar";

// Setup pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function hexToRgbTriplet(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(result[1], 16) / 255,
    g: Number.parseInt(result[2], 16) / 255,
    b: Number.parseInt(result[3], 16) / 255,
  };
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const DEFAULT_TEXT_WIDTH_PT = 200;
const DEFAULT_IMAGE_WIDTH_PT = 150;

export function PDFEditor() {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const [filename, setFilename] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Page native dimensions in pdfjs pixels at scale=1
  const [pageNative, setPageNative] = useState<PageNativeDimensions>({
    width: 595,
    height: 842,
  });
  const [canvasSize, setCanvasSize] = useState({ width: 595, height: 842 });

  // Editor tools
  const [tool, setTool] = useState<ToolType>("select");
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(14);

  // Overlay elements
  const [elements, setElements] = useState<OverlayElement[]>([]);
  const [history, setHistory] = useState<OverlayElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Interaction state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Erase drawing
  const [eraseStart, setEraseStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [erasePreview, setErasePreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Drag/move
  const dragRef = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Resize state
  const resizeRef = useRef<{
    id: string;
    startMX: number;
    startMY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Pending image placement
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(
    null,
  );

  // Refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------- History management --------------------
  const pushHistory = useCallback(
    (newElements: OverlayElement[]) => {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, newElements];
      });
      setHistoryIndex((i) => i + 1);
      setElements(newElements);
    },
    [historyIndex],
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
    setSelectedId(null);
    setEditingTextId(null);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setElements(history[newIndex]);
    setSelectedId(null);
    setEditingTextId(null);
  }, [history, historyIndex]);

  // -------------------- Keyboard shortcuts --------------------
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key === "y" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement?.tagName !== "TEXTAREA") {
          pushHistory(elements.filter((el) => el.id !== selectedId));
          setSelectedId(null);
        }
      } else if (e.key === "v") setTool("select");
      else if (e.key === "t") setTool("text");
      else if (e.key === "e") setTool("erase");
      else if (e.key === "i") {
        setTool("image");
        imageInputRef.current?.click();
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setEditingTextId(null);
        setEraseStart(null);
        setErasePreview(null);
        setPendingImageDataUrl(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo, selectedId, elements, pushHistory]);

  // -------------------- PDF loading --------------------
  const loadPDF = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setElements([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedId(null);
    setEditingTextId(null);
    setCurrentPage(1);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      setOriginalBytes(bytes);
      setFilename(file.name);

      const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. Make sure it's a valid PDF file.");
      setLoading(false);
    }
  }, []);

  // -------------------- Page rendering --------------------
  useEffect(() => {
    if (!pdfDoc || !mainCanvasRef.current) return;
    let cancelled = false;
    setLoading(true);

    pdfDoc.getPage(currentPage).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: zoom });
      const nativeViewport = page.getViewport({ scale: 1 });

      setPageNative({
        width: nativeViewport.width,
        height: nativeViewport.height,
      });
      setCanvasSize({ width: viewport.width, height: viewport.height });

      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      page
        .render({ canvas, viewport })
        .promise.then(() => {
          if (!cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoom]);

  // -------------------- Coordinate helpers --------------------
  // Canvas pixel (at current zoom) -> PDF native pixel (at scale=1)
  const canvasToPdf = useCallback(
    (cx: number, cy: number) => ({
      x: cx / zoom,
      y: cy / zoom,
    }),
    [zoom],
  );

  // PDF native pixel -> canvas pixel (at current zoom)
  const pdfToCanvas = useCallback(
    (px: number, py: number) => ({
      x: px * zoom,
      y: py * zoom,
    }),
    [zoom],
  );

  function getOverlayPos(e: MouseEvent<HTMLDivElement>) {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // -------------------- Overlay mouse handlers --------------------
  const handleOverlayMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== overlayRef.current) return; // Clicked on a child element

    const { x: cx, y: cy } = getOverlayPos(e);
    const { x: px, y: py } = canvasToPdf(cx, cy);

    if (tool === "text") {
      const newEl: TextElement = {
        id: generateId(),
        type: "text",
        pageIndex: currentPage - 1,
        x: px,
        y: py,
        width: DEFAULT_TEXT_WIDTH_PT,
        height: (fontSize + 4) / zoom,
        text: "",
        fontSize,
        color: textColor,
      };
      pushHistory([...elements, newEl]);
      setSelectedId(newEl.id);
      setEditingTextId(newEl.id);
    } else if (tool === "erase") {
      setEraseStart({ x: cx, y: cy });
      setErasePreview({ x: cx, y: cy, w: 0, h: 0 });
    } else if (tool === "image" && pendingImageDataUrl) {
      const newEl: ImageElement = {
        id: generateId(),
        type: "image",
        pageIndex: currentPage - 1,
        x: px,
        y: py,
        width: DEFAULT_IMAGE_WIDTH_PT,
        height: DEFAULT_IMAGE_WIDTH_PT,
        dataUrl: pendingImageDataUrl,
      };
      pushHistory([...elements, newEl]);
      setPendingImageDataUrl(null);
      setTool("select");
      setSelectedId(newEl.id);
    } else if (tool === "select") {
      setSelectedId(null);
      setEditingTextId(null);
    }
  };

  const handleOverlayMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { x: cx, y: cy } = getOverlayPos(e);

    // Erase drawing
    if (tool === "erase" && eraseStart) {
      setErasePreview({
        x: Math.min(eraseStart.x, cx),
        y: Math.min(eraseStart.y, cy),
        w: Math.abs(cx - eraseStart.x),
        h: Math.abs(cy - eraseStart.y),
      });
    }

    // Drag move
    if (dragRef.current) {
      const dx = cx - dragRef.current.startMX;
      const dy = cy - dragRef.current.startMY;
      const newPdfX = dragRef.current.origX + dx / zoom;
      const newPdfY = dragRef.current.origY + dy / zoom;
      setElements((prev) =>
        prev.map((el) =>
          el.id === dragRef.current?.id
            ? { ...el, x: Math.max(0, newPdfX), y: Math.max(0, newPdfY) }
            : el,
        ),
      );
    }

    // Resize
    if (resizeRef.current) {
      const dx = cx - resizeRef.current.startMX;
      const dy = cy - resizeRef.current.startMY;
      setElements((prev) =>
        prev.map((el) =>
          el.id === resizeRef.current?.id
            ? {
                ...el,
                width: Math.max(20, resizeRef.current!.origW + dx / zoom),
                height: Math.max(10, resizeRef.current!.origH + dy / zoom),
              }
            : el,
        ),
      );
    }
  };

  const handleOverlayMouseUp = (_e: MouseEvent<HTMLDivElement>) => {
    // Erase done
    if (tool === "erase" && eraseStart && erasePreview) {
      const { x: px, y: py } = canvasToPdf(erasePreview.x, erasePreview.y);
      const pw = erasePreview.w / zoom;
      const ph = erasePreview.h / zoom;
      if (pw > 4 && ph > 4) {
        const newEl: EraseElement = {
          id: generateId(),
          type: "erase",
          pageIndex: currentPage - 1,
          x: px,
          y: py,
          width: pw,
          height: ph,
        };
        pushHistory([...elements, newEl]);
      }
      setEraseStart(null);
      setErasePreview(null);
    }

    // End drag
    if (dragRef.current) {
      pushHistory([...elements]);
      dragRef.current = null;
    }

    // End resize
    if (resizeRef.current) {
      pushHistory([...elements]);
      resizeRef.current = null;
    }
  };

  // -------------------- Element interaction --------------------
  const handleElementMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    el: OverlayElement,
  ) => {
    e.stopPropagation();
    setSelectedId(el.id);

    if (tool === "select") {
      const { x: cx, y: cy } = getOverlayPos(e);
      dragRef.current = {
        id: el.id,
        startMX: cx,
        startMY: cy,
        origX: el.x,
        origY: el.y,
      };
    } else if (tool === "text" && el.type === "text") {
      setEditingTextId(el.id);
    }
  };

  const handleResizeMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    el: OverlayElement,
  ) => {
    e.stopPropagation();
    const { x: cx, y: cy } = getOverlayPos(e);
    resizeRef.current = {
      id: el.id,
      startMX: cx,
      startMY: cy,
      origW: el.width,
      origH: el.height,
    };
  };

  const updateTextContent = (id: string, text: string) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id && el.type === "text" ? { ...el, text } : el,
      ),
    );
  };

  const deleteElement = (id: string) => {
    pushHistory(elements.filter((el) => el.id !== id));
    setSelectedId(null);
    setEditingTextId(null);
  };

  // -------------------- File upload --------------------
  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadPDF(file);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") loadPDF(file);
    else toast.error("Please drop a PDF file");
  };

  // -------------------- Image upload --------------------
  const handleImageInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPendingImageDataUrl(dataUrl);
      toast.info("Click on the PDF to place the image");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // -------------------- Zoom --------------------
  const handleZoomIn = () =>
    setZoom((z) =>
      Math.min(ZOOM_MAX, Number.parseFloat((z + ZOOM_STEP).toFixed(2))),
    );
  const handleZoomOut = () =>
    setZoom((z) =>
      Math.max(ZOOM_MIN, Number.parseFloat((z - ZOOM_STEP).toFixed(2))),
    );
  const handleFitWidth = () => {
    const containerWidth =
      (document.getElementById("pdf-container")?.clientWidth ?? 700) - 48;
    if (pageNative.width > 0)
      setZoom(
        Number.parseFloat((containerWidth / pageNative.width).toFixed(2)),
      );
  };

  // -------------------- Export --------------------
  const handleDownload = async () => {
    if (!originalBytes || !pdfDoc) {
      toast.error("No PDF loaded");
      return;
    }

    const toastId = toast.loading("Preparing your PDF...");
    try {
      const pdfLibDoc = await PDFDocument.load(originalBytes, {
        ignoreEncryption: true,
      });
      const helvetica = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
      const pdfLibPages = pdfLibDoc.getPages();

      // Group elements by page
      for (let pi = 0; pi < pdfLibPages.length; pi++) {
        const pageElements = elements.filter((el) => el.pageIndex === pi);
        if (pageElements.length === 0) continue;

        const pdfLibPage = pdfLibPages[pi];
        const { width: pdfW, height: pdfH } = pdfLibPage.getSize();

        // Get pdfjs native dimensions for this page to compute scale
        const pdfjsPage = await pdfDoc.getPage(pi + 1);
        const nativeVP = pdfjsPage.getViewport({ scale: 1 });
        const scaleX = pdfW / nativeVP.width;
        const scaleY = pdfH / nativeVP.height;

        for (const el of pageElements) {
          const x = el.x * scaleX;
          const elH = el.height * scaleY;
          // PDF lib uses bottom-left origin, flip Y
          const y = pdfH - el.y * scaleY - elH;
          const w = el.width * scaleX;

          if (el.type === "erase") {
            pdfLibPage.drawRectangle({
              x,
              y,
              width: w,
              height: elH,
              color: rgb(1, 1, 1),
              opacity: 1,
            });
          } else if (el.type === "text" && el.text.trim()) {
            const { r, g, b } = hexToRgbTriplet(el.color);
            const sz = el.fontSize * scaleY;
            // Draw text line by line
            const lines = el.text.split("\n");
            lines.forEach((line, idx) => {
              try {
                pdfLibPage.drawText(line || " ", {
                  x,
                  y: y + elH - sz * (idx + 1),
                  size: sz,
                  font: helvetica,
                  color: rgb(r, g, b),
                  maxWidth: w,
                });
              } catch (_) {
                // skip problematic text
              }
            });
          } else if (el.type === "image") {
            try {
              const base64 = el.dataUrl.split(",")[1];
              const imgBytes = Uint8Array.from(atob(base64), (c) =>
                c.charCodeAt(0),
              );
              const isJpeg =
                el.dataUrl.startsWith("data:image/jpeg") ||
                el.dataUrl.startsWith("data:image/jpg");
              const embeddedImg = isJpeg
                ? await pdfLibDoc.embedJpg(imgBytes)
                : await pdfLibDoc.embedPng(imgBytes);
              pdfLibPage.drawImage(embeddedImg, {
                x,
                y,
                width: w,
                height: elH,
              });
            } catch (imgErr) {
              console.warn("Failed to embed image:", imgErr);
            }
          }
        }
      }

      const savedBytes = await pdfLibDoc.save();
      const blob = new Blob(
        [savedBytes as unknown as Uint8Array<ArrayBuffer>],
        { type: "application/pdf" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(/\.pdf$/i, "")}_edited.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Try again.", { id: toastId });
    }
  };

  // -------------------- Current page elements --------------------
  const currentElements = elements.filter(
    (el) => el.pageIndex === currentPage - 1,
  );

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: canvasSize.width,
    height: canvasSize.height,
    cursor:
      tool === "text"
        ? "text"
        : tool === "erase"
          ? "crosshair"
          : tool === "image" && pendingImageDataUrl
            ? "copy"
            : "default",
    userSelect: "none",
  };

  // -------------------- Upload screen --------------------
  if (!pdfDoc) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm"
              data-ocid="pdf.error_state"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 max-w-md w-full px-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/assets/generated/pdf-editor-logo-transparent.dim_64x64.png"
              alt="PDFEdit"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                PDFEdit
              </h1>
              <p className="text-sm text-muted-foreground">
                Professional PDF Editor
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            data-ocid="pdf.dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all ${
              isDraggingOver
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-accent/50"
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
              <FileText size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                Drop your PDF here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse files
              </p>
            </div>
            <button
              type="button"
              data-ocid="pdf.upload_button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Upload size={14} />
              Choose PDF File
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Add text, images, erase content, and download your edited PDF.
            <br />
            All processing happens in your browser.
          </p>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    );
  }

  // -------------------- Editor --------------------
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileInput}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleImageInput}
        className="hidden"
      />

      {/* Toolbar */}
      <PDFToolbar
        tool={tool}
        setTool={setTool}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitWidth={handleFitWidth}
        onDownload={handleDownload}
        onAddImage={() => imageInputRef.current?.click()}
        textColor={textColor}
        setTextColor={setTextColor}
        fontSize={fontSize}
        setFontSize={setFontSize}
        filename={filename}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <PDFSidebar
          pdfDoc={pdfDoc}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />

        {/* Canvas area */}
        <main
          id="pdf-container"
          className="flex-1 overflow-auto bg-[oklch(0.08_0.01_260)] flex items-start justify-center p-6"
          style={{ position: "relative" }}
        >
          {/* Loading overlay */}
          {loading && (
            <div
              data-ocid="pdf.loading_state"
              className="absolute inset-0 flex items-center justify-center z-50 bg-background/60 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 text-foreground">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span className="text-sm font-medium">Rendering...</span>
              </div>
            </div>
          )}

          {/* Pending image notice */}
          {pendingImageDataUrl && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg">
              Click on the PDF to place the image
              <button
                type="button"
                onClick={() => {
                  setPendingImageDataUrl(null);
                  setTool("select");
                }}
                className="ml-1 hover:opacity-70"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* PDF canvas + overlay */}
          <div
            style={{
              position: "relative",
              width: canvasSize.width,
              height: canvasSize.height,
              flexShrink: 0,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              borderRadius: "2px",
            }}
          >
            {/* PDF render canvas */}
            <canvas
              ref={mainCanvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                display: "block",
              }}
              data-ocid="pdf.canvas_target"
            />

            {/* Overlay */}
            <div
              ref={overlayRef}
              style={overlayStyle}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUp}
              onMouseLeave={handleOverlayMouseUp}
            >
              {/* Render overlay elements for current page */}
              {currentElements.map((el) => {
                const pos = pdfToCanvas(el.x, el.y);
                const w = el.width * zoom;
                const h = el.height * zoom;
                const isSelected = selectedId === el.id;

                const baseStyle: React.CSSProperties = {
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: w,
                  height: h,
                  boxSizing: "border-box",
                };

                if (el.type === "erase") {
                  return (
                    <div
                      key={el.id}
                      style={{
                        ...baseStyle,
                        background: "white",
                        border: isSelected ? "1.5px dashed #888" : "none",
                        cursor: tool === "select" ? "move" : "default",
                      }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                    >
                      {isSelected && (
                        <>
                          <button
                            type="button"
                            style={{
                              position: "absolute",
                              top: -10,
                              right: -10,
                              background: "hsl(0 70% 50%)",
                              color: "white",
                              border: "none",
                              borderRadius: "50%",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                          >
                            <X size={10} />
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              width: 12,
                              height: 12,
                              background: "#888",
                              cursor: "se-resize",
                              borderRadius: 2,
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, el)}
                          />
                        </>
                      )}
                    </div>
                  );
                }

                if (el.type === "text") {
                  const isEditing = editingTextId === el.id;
                  return (
                    <div
                      key={el.id}
                      style={{
                        ...baseStyle,
                        border: isSelected
                          ? "1.5px solid oklch(0.74 0.14 200)"
                          : isEditing
                            ? "1.5px solid oklch(0.74 0.14 200 / 0.5)"
                            : "1px dashed transparent",
                        cursor: tool === "select" ? "move" : "text",
                        overflow: "visible",
                        zIndex: isEditing ? 20 : 5,
                      }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTextId(el.id);
                        setSelectedId(el.id);
                      }}
                    >
                      {isEditing ? (
                        <textarea
                          value={el.text}
                          onChange={(e) =>
                            updateTextContent(el.id, e.target.value)
                          }
                          onBlur={() => {
                            setEditingTextId(null);
                            if (!el.text.trim()) {
                              pushHistory(
                                elements.filter((x) => x.id !== el.id),
                              );
                            } else {
                              pushHistory([...elements]);
                            }
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            minHeight: el.fontSize * zoom + 8,
                            fontSize: el.fontSize * zoom,
                            color: el.color,
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            resize: "none",
                            padding: 2,
                            fontFamily: "inherit",
                            lineHeight: 1.3,
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            fontSize: el.fontSize * zoom,
                            color: el.color,
                            padding: 2,
                            lineHeight: 1.3,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            pointerEvents: "none",
                          }}
                        >
                          {el.text || (
                            <span style={{ opacity: 0.4, fontStyle: "italic" }}>
                              Click to type...
                            </span>
                          )}
                        </div>
                      )}

                      {isSelected && !isEditing && (
                        <>
                          <button
                            type="button"
                            style={{
                              position: "absolute",
                              top: -10,
                              right: -10,
                              background: "hsl(0 70% 50%)",
                              color: "white",
                              border: "none",
                              borderRadius: "50%",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                          >
                            <X size={10} />
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              width: 12,
                              height: 12,
                              background: "oklch(0.74 0.14 200)",
                              cursor: "se-resize",
                              borderRadius: 2,
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, el)}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: -16,
                              cursor: "move",
                              color: "oklch(0.74 0.14 200)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <GripVertical size={12} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                if (el.type === "image") {
                  return (
                    <div
                      key={el.id}
                      style={{
                        ...baseStyle,
                        border: isSelected
                          ? "1.5px solid oklch(0.74 0.14 200)"
                          : "1px dashed transparent",
                        cursor: tool === "select" ? "move" : "default",
                      }}
                      onMouseDown={(e) => handleElementMouseDown(e, el)}
                    >
                      <img
                        src={el.dataUrl}
                        alt="placed"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "fill",
                          display: "block",
                          pointerEvents: "none",
                        }}
                      />
                      {isSelected && (
                        <>
                          <button
                            type="button"
                            style={{
                              position: "absolute",
                              top: -10,
                              right: -10,
                              background: "hsl(0 70% 50%)",
                              color: "white",
                              border: "none",
                              borderRadius: "50%",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteElement(el.id);
                            }}
                          >
                            <X size={10} />
                          </button>
                          <div
                            style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              width: 12,
                              height: 12,
                              background: "oklch(0.74 0.14 200)",
                              cursor: "se-resize",
                              borderRadius: 2,
                            }}
                            onMouseDown={(e) => handleResizeMouseDown(e, el)}
                          />
                        </>
                      )}
                    </div>
                  );
                }

                return null;
              })}

              {/* Erase preview */}
              {erasePreview && erasePreview.w > 2 && erasePreview.h > 2 && (
                <div
                  style={{
                    position: "absolute",
                    left: erasePreview.x,
                    top: erasePreview.y,
                    width: erasePreview.w,
                    height: erasePreview.h,
                    background: "white",
                    border: "1.5px dashed #999",
                    opacity: 0.85,
                    pointerEvents: "none",
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-center h-8 bg-card border-t border-border flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
