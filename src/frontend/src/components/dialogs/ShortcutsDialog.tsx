import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard } from "lucide-react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: "Tools",
    items: [
      { key: "V", desc: "Select / Move" },
      { key: "T", desc: "Text" },
      { key: "I", desc: "Insert Image" },
      { key: "A", desc: "AI Erase" },
      { key: "E", desc: "Cover / Erase" },
      { key: "H", desc: "Highlight" },
      { key: "D", desc: "Freehand Draw" },
      { key: "S", desc: "Shapes" },
      { key: "B", desc: "Blur / Redact" },
      { key: "X", desc: "Crop" },
      { key: "K", desc: "Eyedropper" },
      { key: "W", desc: "Watermark" },
      { key: "P", desc: "Stamp" },
      { key: "N", desc: "Sticky Note" },
      { key: "C", desc: "Comment" },
      { key: "G", desc: "Signature" },
      { key: "?", desc: "Show Shortcuts" },
    ],
  },
  {
    category: "Edit",
    items: [
      { key: "Ctrl+Z", desc: "Undo" },
      { key: "Ctrl+Y", desc: "Redo" },
      { key: "Ctrl+C", desc: "Copy" },
      { key: "Ctrl+V", desc: "Paste" },
      { key: "Ctrl+D", desc: "Duplicate" },
      { key: "Ctrl+A", desc: "Select All" },
      { key: "Delete", desc: "Delete Selected" },
      { key: "Escape", desc: "Deselect / Cancel" },
    ],
  },
  {
    category: "View",
    items: [
      { key: "Ctrl++", desc: "Zoom In" },
      { key: "Ctrl+-", desc: "Zoom Out" },
      { key: "Ctrl+0", desc: "Fit to Window" },
      { key: "Ctrl+Scroll", desc: "Zoom In/Out" },
      { key: "Space+Drag", desc: "Pan Canvas" },
      { key: "G", desc: "Toggle Grid" },
    ],
  },
  {
    category: "Navigation",
    items: [
      { key: "PageDown", desc: "Next Page" },
      { key: "PageUp", desc: "Previous Page" },
      { key: "Ctrl+S", desc: "Quick Download" },
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl" data-ocid="shortcuts.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={18} className="text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-6 pr-4">
            {SHORTCUTS.map((group) => (
              <div key={group.category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.category}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-foreground/80">{item.desc}</span>
                      <kbd className="px-1.5 py-0.5 text-[11px] bg-muted border border-border rounded font-mono">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            data-ocid="shortcuts.close_button"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
