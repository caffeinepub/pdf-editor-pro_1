import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editorStore";
import { Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface SidebarProps {
  renderThumbnails: (canvas: HTMLCanvasElement, pageIndex: number) => void;
}

export function Sidebar({ renderThumbnails }: SidebarProps) {
  const {
    totalPages,
    currentPage,
    setCurrentPage,
    rotatePage,
    deletePage,
    addBlankPage,
  } = useEditorStore();
  const thumbnailRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  const refreshThumbnails = useCallback(() => {
    for (let i = 0; i < totalPages; i++) {
      const canvas = thumbnailRefs.current[i];
      if (canvas) renderThumbnails(canvas, i);
    }
  }, [totalPages, renderThumbnails]);

  useEffect(() => {
    refreshThumbnails();
  }, [refreshThumbnails]);

  return (
    <div
      className="flex flex-col h-full bg-[oklch(0.13_0.01_260)] border-r border-border"
      style={{ width: 140 }}
    >
      <div className="px-2 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground text-center">
          {totalPages} page{totalPages !== 1 ? "s" : ""}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={`page-thumb-${i}`}
              data-ocid={`sidebar.page.${i + 1}`}
              className={cn(
                "group relative cursor-pointer rounded-lg overflow-hidden transition-all",
                i === currentPage
                  ? "ring-2 ring-primary"
                  : "ring-1 ring-border hover:ring-primary/50",
              )}
            >
              <button
                type="button"
                className="w-full block"
                onClick={() => setCurrentPage(i)}
              >
                <canvas
                  ref={(el) => {
                    thumbnailRefs.current[i] = el;
                  }}
                  width={116}
                  height={150}
                  className="w-full bg-white block"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5">
                  <p className="text-[10px] text-center text-white">{i + 1}</p>
                </div>
              </button>

              {/* Page action buttons on hover */}
              <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5 bg-black/60 rounded p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(i, "ccw");
                      }}
                      className="p-0.5 text-white hover:text-primary"
                      data-ocid={`sidebar.page.${i + 1}.rotate_ccw`}
                    >
                      <RotateCcw size={10} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Rotate CCW</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        rotatePage(i, "cw");
                      }}
                      className="p-0.5 text-white hover:text-primary"
                      data-ocid={`sidebar.page.${i + 1}.rotate_cw`}
                    >
                      <RotateCw size={10} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Rotate CW</TooltipContent>
                </Tooltip>
                {totalPages > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(i);
                        }}
                        className="p-0.5 text-white hover:text-destructive"
                        data-ocid={`sidebar.page.${i + 1}.delete_button`}
                      >
                        <Trash2 size={10} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Delete Page</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addBlankPage(i);
                      }}
                      className="p-0.5 text-white hover:text-primary"
                      data-ocid={`sidebar.page.${i + 1}.add_button`}
                    >
                      <Plus size={10} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Add page after</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
