import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { downloadBytes, mergePdfs } from "@/utils/pdfUtils";
import { FilePlus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface MergePDFDialogProps {
  open: boolean;
  onClose: () => void;
  currentBytes: Uint8Array | null;
  currentFilename: string;
}

interface PdfEntry {
  name: string;
  bytes: Uint8Array;
}

export function MergePDFDialog({
  open,
  onClose,
  currentBytes,
  currentFilename,
}: MergePDFDialogProps) {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [merging, setMerging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".pdf")) continue;
      const ab = await file.arrayBuffer();
      setEntries((prev) => [
        ...prev,
        { name: file.name, bytes: new Uint8Array(ab) },
      ]);
    }
  }

  async function doMerge() {
    if (!currentBytes) return;
    setMerging(true);
    try {
      const all = [currentBytes, ...entries.map((e) => e.bytes)];
      const merged = await mergePdfs(all);
      downloadBytes(merged, "merged.pdf", "application/pdf");
      toast.success("PDFs merged successfully");
      onClose();
    } catch {
      toast.error("Failed to merge PDFs");
    } finally {
      setMerging(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-ocid="merge.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus size={18} className="text-primary" /> Merge PDFs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current file:{" "}
            <strong className="text-foreground">{currentFilename}</strong> will
            be first. Add more PDFs below.
          </p>

          <button
            type="button"
            className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
            data-ocid="merge.upload_button"
          >
            <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to add PDF files
            </p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          {entries.length > 0 && (
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {entries.map((e, i) => (
                  <div
                    key={`entry-${i}`}
                    className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                  >
                    <span className="truncate">{e.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEntries((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="ml-2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              data-ocid="merge.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={doMerge}
              disabled={merging || entries.length === 0}
              data-ocid="merge.confirm_button"
            >
              {merging ? "Merging..." : `Merge ${1 + entries.length} PDFs`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
