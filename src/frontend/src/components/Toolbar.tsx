import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editorStore";
import type { ShapeType, ToolType } from "@/types/editor";
import {
  ALargeSmall,
  ArrowUpRight,
  Circle,
  Crop,
  Eraser,
  Highlighter,
  Image,
  MessageSquare,
  Minus,
  MousePointer2,
  PenLine,
  Pipette,
  RectangleHorizontal,
  ScanLine,
  Sparkles,
  Stamp,
  Star,
  StickyNote,
  Triangle,
  Type,
  Wand2,
} from "lucide-react";
import { useState } from "react";

interface ToolGroup {
  label: string;
  tools: ToolDef[];
}

interface ToolDef {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  sub?: Array<{ id: string; icon: React.ReactNode; label: string }>;
}

const SHAPE_ICONS: Record<ShapeType, React.ReactNode> = {
  rect: <RectangleHorizontal size={16} />,
  ellipse: <Circle size={16} />,
  line: <Minus size={16} />,
  arrow: <ArrowUpRight size={16} />,
  triangle: <Triangle size={16} />,
  star: <Star size={16} />,
};

const TOOL_GROUPS: ToolGroup[] = [
  {
    label: "Selection",
    tools: [
      {
        id: "select",
        icon: <MousePointer2 size={18} />,
        label: "Select & Move",
        shortcut: "V",
      },
    ],
  },
  {
    label: "Text & Content",
    tools: [
      { id: "text", icon: <Type size={18} />, label: "Text", shortcut: "T" },
      {
        id: "image",
        icon: <Image size={18} />,
        label: "Insert Image",
        shortcut: "I",
      },
    ],
  },
  {
    label: "AI & Erase",
    tools: [
      {
        id: "aiErase",
        icon: <Sparkles size={18} />,
        label: "AI Erase",
        shortcut: "A",
      },
      {
        id: "erase",
        icon: <Eraser size={18} />,
        label: "Cover / Erase",
        shortcut: "E",
      },
      {
        id: "blur",
        icon: <ScanLine size={18} />,
        label: "Blur / Redact",
        shortcut: "B",
      },
    ],
  },
  {
    label: "Draw & Annotate",
    tools: [
      {
        id: "highlight",
        icon: <Highlighter size={18} />,
        label: "Highlight",
        shortcut: "H",
      },
      {
        id: "draw",
        icon: <PenLine size={18} />,
        label: "Freehand Draw",
        shortcut: "D",
      },
      {
        id: "shape",
        icon: <RectangleHorizontal size={18} />,
        label: "Shapes",
        shortcut: "S",
      },
    ],
  },
  {
    label: "Markup",
    tools: [
      { id: "stamp", icon: <Stamp size={18} />, label: "Stamp", shortcut: "P" },
      {
        id: "note",
        icon: <StickyNote size={18} />,
        label: "Sticky Note",
        shortcut: "N",
      },
      {
        id: "comment",
        icon: <MessageSquare size={18} />,
        label: "Comment",
        shortcut: "C",
      },
      {
        id: "signature",
        icon: <ALargeSmall size={18} />,
        label: "Signature",
        shortcut: "G",
      },
    ],
  },
  {
    label: "Page",
    tools: [
      { id: "crop", icon: <Crop size={18} />, label: "Crop", shortcut: "X" },
      {
        id: "watermark",
        icon: <Wand2 size={18} />,
        label: "Watermark",
        shortcut: "W",
      },
      {
        id: "eyedropper",
        icon: <Pipette size={18} />,
        label: "Eyedropper",
        shortcut: "K",
      },
    ],
  },
];

export function Toolbar() {
  const { tool, shapeType, setTool, setShapeType } = useEditorStore();
  const [shapeExpanded, setShapeExpanded] = useState(false);

  function handleToolClick(id: ToolType) {
    if (id === "shape") {
      setShapeExpanded((v) => !v);
    } else {
      setShapeExpanded(false);
    }
    setTool(id);
  }

  return (
    <div className="flex flex-col gap-1 p-1.5 w-[52px] bg-[oklch(0.13_0.01_260)] border-r border-border overflow-y-auto overflow-x-hidden">
      {TOOL_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {group.tools.map((t) => (
            <div key={t.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-ocid={`toolbar.${t.id}.button`}
                    onClick={() => handleToolClick(t.id)}
                    className={cn(
                      "toolbar-btn w-9 h-9 relative",
                      tool === t.id && "active",
                    )}
                    aria-label={t.label}
                  >
                    {t.id === "shape" ? SHAPE_ICONS[shapeType] : t.icon}
                    {t.id === "aiErase" && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="flex items-center gap-2"
                >
                  <span>{t.label}</span>
                  {t.shortcut && (
                    <kbd className="px-1 py-0.5 text-[10px] bg-muted rounded font-mono">
                      {t.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Shape sub-panel */}
              {t.id === "shape" && shapeExpanded && (
                <div className="absolute left-[52px] top-auto z-50 flex flex-col bg-popover border border-border rounded-md shadow-panel p-1 gap-0.5">
                  {(Object.keys(SHAPE_ICONS) as ShapeType[]).map((s) => (
                    <Tooltip key={s}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          data-ocid={`toolbar.shape.${s}.button`}
                          onClick={() => {
                            setShapeType(s);
                            setTool("shape");
                            setShapeExpanded(false);
                          }}
                          className={cn(
                            "toolbar-btn",
                            shapeType === s && "active",
                          )}
                          aria-label={s}
                        >
                          {SHAPE_ICONS[s]}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{s}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="h-px bg-border mx-1 my-0.5" />
        </div>
      ))}
    </div>
  );
}
