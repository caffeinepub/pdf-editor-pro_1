import { EditorLayout } from "@/components/EditorLayout";
import { ImageEditor } from "@/components/ImageEditor";
import { PDFEditor } from "@/components/PDFEditor";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useEditorStore } from "@/store/editorStore";
import type { EditorMode } from "@/types/editor";
import { useCallback, useRef, useState } from "react";

function AppInner() {
  const [mode, setMode] = useState<EditorMode>("pdf");
  const [filename, setFilename] = useState("");
  const [originalBytes, setOriginalBytes] = useState<Uint8Array | null>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleModeChange = useCallback((newMode: EditorMode) => {
    setMode(newMode);
    setFilename("");
    setOriginalBytes(null);
    useEditorStore.getState().initPages(0);
  }, []);

  async function handleExportPdf() {
    if ((window as any).__pdfExport) {
      await (window as any).__pdfExport();
    }
  }

  useKeyboardShortcuts(() => {}, handleExportPdf);

  return (
    <EditorLayout
      mode={mode}
      onModeChange={handleModeChange}
      filename={filename}
      originalBytes={originalBytes}
      onExportPdf={handleExportPdf}
      currentCanvasRef={currentCanvasRef.current}
    >
      {mode === "pdf" ? (
        <PDFEditor
          onDocumentLoaded={(fname, _count, bytes) => {
            setFilename(fname);
            setOriginalBytes(bytes);
          }}
        />
      ) : (
        <ImageEditor onImageLoaded={(fname) => setFilename(fname)} />
      )}
    </EditorLayout>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <AppInner />
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  );
}
