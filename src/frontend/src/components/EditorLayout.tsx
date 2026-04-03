import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editorStore";
import type { EditorMode } from "@/types/editor";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  FilePlus,
  FileText,
  Grid2X2,
  Keyboard,
  Maximize2,
  MessageSquare,
  Moon,
  PanelLeft,
  PanelRight,
  Redo2,
  Scissors,
  Sparkles,
  StickyNote,
  Sun,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { Toolbar } from "./Toolbar";
import { ExportDialog } from "./dialogs/ExportDialog";
import { MergePDFDialog } from "./dialogs/MergePDFDialog";
import { ShortcutsDialog } from "./dialogs/ShortcutsDialog";
import { SignaturePad } from "./dialogs/SignaturePad";
import { SplitPDFDialog } from "./dialogs/SplitPDFDialog";
import { CommentsPanel } from "./panels/CommentsPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";

interface EditorLayoutProps {
  children: React.ReactNode;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  filename: string;
  originalBytes: Uint8Array | null;
  onExportPdf: () => Promise<void>;
  currentCanvasRef: HTMLCanvasElement | null;
}

export function EditorLayout({
  children,
  mode,
  onModeChange,
  filename,
  originalBytes,
  onExportPdf,
  currentCanvasRef,
}: EditorLayoutProps) {
  const {
    zoom,
    setZoom,
    undo,
    redo,
    historyIndex,
    history,
    currentPage,
    totalPages,
    setCurrentPage,
    showGrid,
    setShowGrid,
    showNotes,
    setShowNotes,
    showComments,
    setShowComments,
    rightPanelTab,
    setRightPanelTab,
    leftSidebarOpen,
    setLeftSidebarOpen,
    rightPanelOpen,
    setRightPanelOpen,
    tool,
  } = useEditorStore();

  const [darkMode, setDarkMode] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);

  // Handle signature tool
  const prevTool = useEditorStore((s) => s.tool);
  if (prevTool === "signature" && !sigOpen) {
    // open signature pad
  }

  function zoomFit() {
    setZoom(1);
  }

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-1.5 bg-[oklch(0.12_0.01_260)] border-b border-border shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles size={14} className="text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm hidden sm:block">
            PDF Editor Pro
          </span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Mode switch */}
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as EditorMode)}>
          <TabsList className="h-7 bg-muted">
            <TabsTrigger
              value="pdf"
              className="h-6 text-xs gap-1"
              data-ocid="header.pdf_mode.tab"
            >
              <FileText size={12} /> PDF
            </TabsTrigger>
            <TabsTrigger
              value="image"
              className="h-6 text-xs gap-1"
              data-ocid="header.image_mode.tab"
            >
              <FileImage size={12} /> Image
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={undo}
                disabled={!canUndo}
                data-ocid="header.undo.button"
              >
                <Undo2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={redo}
                disabled={!canRedo}
                data-ocid="header.redo.button"
              >
                <Redo2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom - 0.25)}
                data-ocid="header.zoom_out.button"
              >
                <ZoomOut size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground w-12 text-center"
            onClick={zoomFit}
            data-ocid="header.zoom_level.button"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoom(zoom + 0.25)}
                data-ocid="header.zoom_in.button"
              >
                <ZoomIn size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={zoomFit}
                data-ocid="header.zoom_fit.button"
              >
                <Maximize2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to 100%</TooltipContent>
          </Tooltip>
        </div>

        {mode === "pdf" && totalPages > 0 && (
          <>
            <Separator orientation="vertical" className="h-6" />
            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                data-ocid="header.prev_page.button"
              >
                <ChevronLeft size={14} />
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground w-16 text-center hover:text-foreground"
                data-ocid="header.page_indicator.button"
              >
                {currentPage + 1} / {totalPages}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                }
                data-ocid="header.next_page.button"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* PDF tools */}
        {mode === "pdf" && originalBytes && (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMergeOpen(true)}
                  data-ocid="header.merge.button"
                >
                  <FilePlus size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Merge PDFs</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSplitOpen(true)}
                  data-ocid="header.split.button"
                >
                  <Scissors size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split PDF</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* View toggles */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showGrid ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowGrid(!showGrid)}
                data-ocid="header.grid.toggle"
              >
                <Grid2X2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid (G)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showNotes ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowNotes(!showNotes)}
                data-ocid="header.notes.toggle"
              >
                <StickyNote size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Notes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showComments ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowComments(!showComments)}
                data-ocid="header.comments.toggle"
              >
                <MessageSquare size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Comments</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Shortcuts & Dark mode */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShortcutsOpen(true)}
              data-ocid="header.shortcuts.button"
            >
              <Keyboard size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Shortcuts (?)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDarkMode(!darkMode)}
              data-ocid="header.darkmode.toggle"
            >
              {darkMode ? <Moon size={14} /> : <Sun size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Dark Mode</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setExportOpen(true)}
          data-ocid="header.export.button"
        >
          <Download size={13} /> Export
        </Button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: panel toggle + toolbar */}
        <div className="flex shrink-0">
          <div className="flex flex-col bg-[oklch(0.12_0.01_260)] border-r border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 m-1"
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              data-ocid="header.left_sidebar.toggle"
            >
              <PanelLeft size={14} />
            </Button>
          </div>
          {leftSidebarOpen && <Toolbar />}
        </div>

        {/* Center: editor */}
        <div className="flex flex-1 overflow-hidden">{children}</div>

        {/* Right panel */}
        {rightPanelOpen && (
          <div className="flex flex-col w-56 bg-[oklch(0.12_0.01_260)] border-l border-border shrink-0">
            <Tabs
              value={rightPanelTab}
              onValueChange={(v) => setRightPanelTab(v as any)}
            >
              <TabsList className="w-full h-8 rounded-none border-b border-border bg-transparent">
                {(["properties", "layers", "history", "comments"] as const).map(
                  (t) => (
                    <TabsTrigger
                      key={t}
                      value={t}
                      className="flex-1 text-[10px] h-7 data-[state=active]:bg-accent"
                      data-ocid={`right_panel.${t}.tab`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>
            <div className="flex-1 overflow-hidden">
              {rightPanelTab === "properties" && <PropertiesPanel />}
              {rightPanelTab === "layers" && <LayersPanel />}
              {rightPanelTab === "history" && <HistoryPanel />}
              {rightPanelTab === "comments" && <CommentsPanel />}
            </div>
          </div>
        )}
        <div className="flex flex-col bg-[oklch(0.12_0.01_260)] border-l border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 m-1"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            data-ocid="header.right_panel.toggle"
          >
            <PanelRight size={14} />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-3 py-1 bg-[oklch(0.10_0.01_260)] border-t border-border text-[11px] text-muted-foreground shrink-0">
        <span>{filename || "No file"}</span>
        {totalPages > 0 && (
          <span>
            Page {currentPage + 1}/{totalPages}
          </span>
        )}
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Tool: {tool}</span>
        <div className="flex-1" />
        <span>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </span>
      </div>

      {/* Dialogs */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        mode={mode}
        onExportPdf={async (_opts) => {
          await onExportPdf();
        }}
        canvasRef={currentCanvasRef}
        filename={filename}
      />
      <MergePDFDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        currentBytes={originalBytes}
        currentFilename={filename}
      />
      <SplitPDFDialog
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        originalBytes={originalBytes}
        totalPages={totalPages}
        filename={filename}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <SignaturePad
        open={sigOpen}
        onClose={() => setSigOpen(false)}
        pageIndex={0}
      />
    </div>
  );
}
