import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editorStore";
import type { OverlayElement } from "@/types/editor";
import { Eye, EyeOff, Layers, Lock, Unlock } from "lucide-react";

const TYPE_LABELS: Record<OverlayElement["type"], string> = {
  text: "Text",
  erase: "Cover/Erase",
  aiErase: "AI Erase",
  imageInsert: "Image",
  highlight: "Highlight",
  draw: "Drawing",
  shape: "Shape",
  blur: "Blur",
  watermark: "Watermark",
  stamp: "Stamp",
  note: "Note",
  signature: "Signature",
  comment: "Comment",
  formField: "Form Field",
};

export function LayersPanel() {
  const { pages, currentPage, selectedIds, setSelectedIds, updateElement } =
    useEditorStore();
  const elements = [...(pages[currentPage]?.elements || [])].reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Layers size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium">Layers ({elements.length})</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {elements.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No elements on this page
            </p>
          )}
          {elements.map((el, i) => (
            <button
              key={el.id}
              type="button"
              data-ocid={`layers.item.${i + 1}`}
              onClick={() => setSelectedIds([el.id])}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left transition-colors",
                selectedIds.includes(el.id)
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-foreground/80 hover:bg-accent",
              )}
            >
              <span className="flex-1 truncate">{TYPE_LABELS[el.type]}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { visible: !el.visible });
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                {el.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { locked: !el.locked });
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                {el.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
