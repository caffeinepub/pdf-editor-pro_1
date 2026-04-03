import { useEditorStore } from "@/store/editorStore";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { EditorCanvas } from "./EditorCanvas";

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface ImageEditorProps {
  onImageLoaded?: (filename: string) => void;
}

export function ImageEditor({ onImageLoaded }: ImageEditorProps) {
  const { zoom, initPages } = useEditorStore();
  const [imageCanvas, setImageCanvas] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadImage(file: File) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error("Unsupported image format");
      return;
    }
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        setImageCanvas(canvas);
        initPages(1);
        onImageLoaded?.(file.name);
        toast.success(`Loaded: ${file.name}`);
        setLoading(false);
      };
      img.onerror = () => {
        toast.error("Failed to load image");
        setLoading(false);
      };
      img.src = url;
    } catch {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  }

  if (!imageCanvas) {
    return (
      <div
        className={`flex-1 flex items-center justify-center transition-colors ${
          isDragOver ? "bg-primary/10" : "bg-background"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        data-ocid="image.dropzone"
      >
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-3"
              data-ocid="image.loading_state"
            >
              <Loader2
                className="animate-spin text-primary mx-auto"
                size={40}
              />
              <p className="text-muted-foreground">Loading image...</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20 flex items-center justify-center">
                <ImageOff size={56} className="text-purple-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Drop an Image here</h2>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WEBP, GIF supported
                </p>
              </div>
              <label
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
                data-ocid="image.upload_button"
              >
                <Upload size={18} /> Open Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const imgW = (imageCanvas.width || 800) * zoom;
  const imgH = (imageCanvas.height || 600) * zoom;

  return (
    <div className="flex-1 overflow-auto bg-[oklch(0.09_0.01_260)] p-4">
      <div className="flex justify-center">
        <div
          className="relative shadow-2xl"
          style={{ width: imgW, height: imgH }}
        >
          <EditorCanvas
            baseCanvas={imageCanvas}
            pageIndex={0}
            width={imgW}
            height={imgH}
            zoom={zoom}
          />
        </div>
      </div>
    </div>
  );
}
