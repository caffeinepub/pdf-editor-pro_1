import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadBytes, splitPdf } from "@/utils/pdfUtils";
import { Scissors } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SplitPDFDialogProps {
  open: boolean;
  onClose: () => void;
  originalBytes: Uint8Array | null;
  totalPages: number;
  filename: string;
}

export function SplitPDFDialog({
  open,
  onClose,
  originalBytes,
  totalPages,
  filename,
}: SplitPDFDialogProps) {
  const [rangeText, setRangeText] = useState("1-3, 4-6");
  const [splitting, setSplitting] = useState(false);

  async function doSplit() {
    if (!originalBytes) return;
    const parts = rangeText.split(",").map((s) => s.trim());
    const ranges: Array<[number, number]> = [];
    for (const part of parts) {
      const m = part.match(/^(\d+)-(\d+)$/);
      if (!m) {
        toast.error(`Invalid range: ${part}`);
        return;
      }
      const s = Number.parseInt(m[1]) - 1;
      const e = Number.parseInt(m[2]) - 1;
      if (s < 0 || e >= totalPages || s > e) {
        toast.error(`Out of range: ${part}`);
        return;
      }
      ranges.push([s, e]);
    }
    setSplitting(true);
    try {
      const results = await splitPdf(originalBytes, ranges);
      for (let i = 0; i < results.length; i++) {
        const base = filename.replace(/\.pdf$/i, "");
        downloadBytes(
          results[i],
          `${base}_part${i + 1}.pdf`,
          "application/pdf",
        );
      }
      toast.success(`Split into ${results.length} PDF(s)`);
      onClose();
    } catch {
      toast.error("Failed to split PDF");
    } finally {
      setSplitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="split.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors size={18} className="text-primary" /> Split PDF
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Total pages: {totalPages}
          </p>
          <div className="space-y-2">
            <Label>Page ranges (comma-separated)</Label>
            <Input
              value={rangeText}
              onChange={(e) => setRangeText(e.target.value)}
              placeholder="e.g. 1-3, 4-6, 7-10"
              data-ocid="split.input"
            />
            <p className="text-xs text-muted-foreground">
              Each range downloads as a separate PDF
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              data-ocid="split.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={doSplit}
              disabled={splitting}
              data-ocid="split.confirm_button"
            >
              {splitting ? "Splitting..." : "Split"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
