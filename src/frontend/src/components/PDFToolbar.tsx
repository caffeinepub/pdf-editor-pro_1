import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ToolType } from "@/types/pdf";
import {
  Download,
  Eraser,
  FileText,
  ImagePlus,
  Maximize2,
  MousePointer2,
  Redo2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface PDFToolbarProps {
  tool: ToolType;
  setTool: (t: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onDownload: () => void;
  onAddImage: () => void;
  textColor: string;
  setTextColor: (c: string) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  filename: string;
}

export function PDFToolbar({
  tool,
  setTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onDownload,
  onAddImage,
  textColor,
  setTextColor,
  fontSize,
  setFontSize,
  filename,
}: PDFToolbarProps) {
  const toolBtnClass = (t: ToolType) =>
    `toolbar-btn${tool === t ? " active" : ""}`;

  return (
    <header className="flex items-center gap-1 px-3 h-12 bg-card border-b border-border flex-shrink-0">
      {/* Branding */}
      <div className="flex items-center gap-2 mr-3">
        <img
          src="/assets/generated/pdf-editor-logo-transparent.dim_64x64.png"
          alt="PDFEdit"
          className="w-6 h-6 object-contain"
        />
        <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:block">
          PDFEdit
        </span>
      </div>

      {/* Filename */}
      {filename && (
        <div className="flex items-center gap-1.5 mr-3 text-muted-foreground text-xs font-mono-code truncate max-w-[180px]">
          <FileText size={12} />
          <span className="truncate">{filename}</span>
        </div>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Tool buttons */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={toolBtnClass("select")}
              onClick={() => setTool("select")}
              data-ocid="pdf.toolbar.select_button"
            >
              <MousePointer2 size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Select / Move (V)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={toolBtnClass("text")}
              onClick={() => setTool("text")}
              data-ocid="pdf.toolbar.text_button"
            >
              <Type size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add Text (T)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={toolBtnClass("erase")}
              onClick={() => setTool("erase")}
              data-ocid="pdf.toolbar.erase_button"
            >
              <Eraser size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Erase / Cover (E)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={toolBtnClass("image")}
              onClick={() => {
                setTool("image");
                onAddImage();
              }}
              data-ocid="pdf.toolbar.image_button"
            >
              <ImagePlus size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add Image (I)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text options - shown when text tool active */}
      {tool === "text" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <label
              htmlFor="font-size-select"
              className="text-xs text-muted-foreground"
            >
              Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              id="font-size-select"
              className="bg-input border border-border rounded text-xs text-foreground px-1 py-0.5 h-6"
            >
              {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label
              htmlFor="text-color-input"
              className="text-xs text-muted-foreground"
            >
              Color
            </label>
            <input
              type="color"
              id="text-color-input"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent"
            />
          </div>
          <Separator orientation="vertical" className="h-6" />
        </div>
      )}

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onUndo}
              disabled={!canUndo}
              data-ocid="pdf.toolbar.undo_button"
            >
              <Undo2 size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onRedo}
              disabled={!canRedo}
              data-ocid="pdf.toolbar.redo_button"
            >
              <Redo2 size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onZoomOut}
              data-ocid="pdf.toolbar.zoom_out_button"
            >
              <ZoomOut size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <span className="text-xs font-mono-code text-muted-foreground w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="toolbar-btn"
              onClick={onZoomIn}
              data-ocid="pdf.toolbar.zoom_in_button"
            >
              <ZoomIn size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="toolbar-btn" onClick={onFitWidth}>
              <Maximize2 size={16} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Fit Width</TooltipContent>
        </Tooltip>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Download */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            onClick={onDownload}
            data-ocid="pdf.toolbar.download_button"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Download edited PDF</TooltipContent>
      </Tooltip>
    </header>
  );
}
