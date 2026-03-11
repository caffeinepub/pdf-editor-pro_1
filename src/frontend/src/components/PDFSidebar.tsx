import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ThumbnailCanvas } from "./ThumbnailCanvas";

interface PDFSidebarProps {
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PDFSidebar({
  pdfDoc,
  totalPages,
  currentPage,
  onPageChange,
}: PDFSidebarProps) {
  if (!pdfDoc) {
    return (
      <aside className="w-44 flex-shrink-0 bg-sidebar border-r border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground p-4">
          <Layers size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">No PDF loaded</p>
        </div>
      </aside>
    );
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);

  return (
    <aside className="w-44 flex-shrink-0 bg-sidebar border-r border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Pages
        </span>
        <span className="text-xs font-mono-code text-muted-foreground">
          {totalPages}
        </span>
      </div>

      {/* Thumbnails */}
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1">
          {pageNumbers.map((pageNum) => (
            <ThumbnailCanvas
              key={pageNum}
              pdfDoc={pdfDoc}
              pageIndex={pageNum - 1}
              isActive={currentPage === pageNum}
              onClick={() => onPageChange(pageNum)}
              ocid={`pdf.sidebar.item.${pageNum}`}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Page nav */}
      <div className="flex items-center justify-between px-2 py-2 border-t border-border flex-shrink-0">
        <button
          type="button"
          className="toolbar-btn w-7 h-7"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          data-ocid="pdf.page.prev_button"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-mono-code text-foreground">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          className="toolbar-btn w-7 h-7"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          data-ocid="pdf.page.next_button"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  );
}
