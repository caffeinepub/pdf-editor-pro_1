import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { exportCanvasAsImage } from "@/utils/imageUtils";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "pdf" | "image";
  onExportPdf: (opts: PdfExportOptions) => Promise<void>;
  canvasRef: HTMLCanvasElement | null;
  filename: string;
}

export interface PdfExportOptions {
  flatten: boolean;
  quality: number;
}

export function ExportDialog({
  open,
  onClose,
  mode,
  onExportPdf,
  canvasRef,
  filename,
}: ExportDialogProps) {
  const [flatten, setFlatten] = useState(true);
  const [quality, setQuality] = useState(95);
  const [imgFormat, setImgFormat] = useState<"png" | "jpg">("png");
  const [exporting, setExporting] = useState(false);

  async function doExport() {
    setExporting(true);
    try {
      if (mode === "pdf") {
        await onExportPdf({ flatten, quality: quality / 100 });
      } else {
        if (!canvasRef) return;
        const ext = imgFormat === "png" ? "png" : "jpg";
        const base = filename.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
        await exportCanvasAsImage(
          canvasRef,
          `${base}.${ext}`,
          `image/${imgFormat}`,
          quality / 100,
        );
        toast.success("Image exported");
      }
      onClose();
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="export.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} className="text-primary" /> Export
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mode === "pdf" ? (
            <>
              <div className="flex items-center justify-between">
                <Label>Flatten annotations</Label>
                <Switch
                  checked={flatten}
                  onCheckedChange={setFlatten}
                  data-ocid="export.flatten.switch"
                />
              </div>
              <div className="space-y-2">
                <Label>Image quality: {quality}%</Label>
                <Slider
                  min={50}
                  max={100}
                  step={5}
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  data-ocid="export.quality.slider"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={imgFormat}
                  onValueChange={(v) => setImgFormat(v as "png" | "jpg")}
                >
                  <SelectTrigger data-ocid="export.format.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG (lossless)</SelectItem>
                    <SelectItem value="jpg">JPEG (lossy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {imgFormat === "jpg" && (
                <div className="space-y-2">
                  <Label>Quality: {quality}%</Label>
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    value={[quality]}
                    onValueChange={([v]) => setQuality(v)}
                  />
                </div>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              data-ocid="export.cancel_button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={doExport}
              disabled={exporting}
              data-ocid="export.confirm_button"
            >
              <Download size={14} className="mr-1" />
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
