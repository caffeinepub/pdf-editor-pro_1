// Image processing utilities

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.95,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to convert canvas to blob"));
      },
      type,
      quality,
    );
  });
}

export async function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  type = "image/png",
  quality = 0.95,
): Promise<void> {
  const blob = await canvasToBlob(canvas, type, quality);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function resizeImageData(
  imageData: ImageData,
  maxW: number,
  maxH: number,
): ImageData {
  const { width, height } = imageData;
  const scale = Math.min(maxW / width, maxH / height, 1);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);
  const src = imageDataToCanvas(imageData);
  const dst = document.createElement("canvas");
  dst.width = newW;
  dst.height = newH;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(src, 0, 0, newW, newH);
  return ctx.getImageData(0, 0, newW, newH);
}

export function applyPixelateEffect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  blockSize: number,
): void {
  const imageData = ctx.getImageData(x, y, w, h);
  const data = imageData.data;
  const iw = imageData.width;
  const ih = imageData.height;

  for (let by = 0; by < ih; by += blockSize) {
    for (let bx = 0; bx < iw; bx += blockSize) {
      const pi = (by * iw + bx) * 4;
      const r = data[pi];
      const g = data[pi + 1];
      const b = data[pi + 2];
      for (let dy = 0; dy < blockSize && by + dy < ih; dy++) {
        for (let dx = 0; dx < blockSize && bx + dx < iw; dx++) {
          const idx = ((by + dy) * iw + (bx + dx)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }
  }
  ctx.putImageData(imageData, x, y);
}

export function getImageDataFromCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const ctx = canvas.getContext("2d")!;
  return ctx.getImageData(x, y, w, h);
}
