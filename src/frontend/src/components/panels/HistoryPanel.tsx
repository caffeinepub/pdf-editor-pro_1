import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editorStore";
import { History, RotateCcw } from "lucide-react";

export function HistoryPanel() {
  const { history, historyIndex, jumpToHistory } = useEditorStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <History size={14} className="text-muted-foreground" />
        <span className="text-xs font-medium">History ({history.length})</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No history yet
            </p>
          )}
          {history.map((entry, i) => (
            <button
              key={entry.timestamp}
              type="button"
              data-ocid={`history.item.${i + 1}`}
              onClick={() => jumpToHistory(i)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors",
                i === historyIndex
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                i > historyIndex && "opacity-40",
              )}
            >
              <RotateCcw size={10} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{entry.description}</div>
                <div className="text-[10px] opacity-60">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
              {i === historyIndex && (
                <span className="text-[10px] bg-primary/30 px-1 rounded">
                  current
                </span>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
