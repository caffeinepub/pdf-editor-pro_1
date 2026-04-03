import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { generateId, useEditorStore } from "@/store/editorStore";
import type { SignatureElement } from "@/types/editor";
import { Pen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
  open: boolean;
  onClose: () => void;
  pageIndex: number;
}

export function SignaturePad({ open, onClose, pageIndex }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#1e3a8a");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [hasContent, setHasContent] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const { addElement } = useEditorStore();

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }, [open]);

  function getPos(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
    lastPos.current = pos;
  }

  function draw(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPos.current = pos;
    setHasContent(true);
  }

  function endDraw() {
    setIsDrawing(false);
    lastPos.current = null;
  }

  function clearPad() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }

  function placeSignature() {
    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    const sig: SignatureElement = {
      id: generateId(),
      type: "signature",
      pageIndex,
      x: 100,
      y: 100,
      width: 250,
      height: 80,
      dataUrl,
      opacity: 1,
      rotation: 0,
      locked: false,
      visible: true,
      createdAt: Date.now(),
    };
    addElement(sig, "Add signature");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-ocid="signature.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen size={18} className="text-primary" />
            Draw Signature
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Color</Label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-border"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <Label>Width</Label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[strokeWidth]}
                onValueChange={([v]) => setStrokeWidth(v)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-4">
                {strokeWidth}
              </span>
            </div>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              className="w-full border-2 border-dashed border-border rounded-lg bg-white cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-muted text-sm">
                  Draw your signature here
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={clearPad}>
              <Trash2 size={14} className="mr-1" /> Clear
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                data-ocid="signature.cancel_button"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={placeSignature}
                disabled={!hasContent}
                data-ocid="signature.confirm_button"
              >
                Place Signature
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
