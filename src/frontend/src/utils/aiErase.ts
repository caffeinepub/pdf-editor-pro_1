// Content-aware fill / inpainting for AI Erase

const PATCH_SIZE = 9;
const SAMPLE_RING_WIDTH = 40;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function gaussianKernel(sigma: number, radius: number): number[] {
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      const v = Math.exp(-(i * i + j * j) / (2 * sigma * sigma));
      kernel.push(v);
      sum += v;
    }
  }
  return kernel.map((k) => k / sum);
}

function applyGaussianBlurOnMaskEdge(
  data: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  edgeWidth: number,
): void {
  const sigma = edgeWidth / 2;
  const radius = Math.min(edgeWidth, 4);
  const kernel = gaussianKernel(sigma, radius);
  const scratch = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mIdx = (y * width + x) * 4;
      if (mask[mIdx] < 128) continue;

      let nearEdge = false;
      outer: for (let dy = -edgeWidth; dy <= edgeWidth; dy++) {
        for (let dx = -edgeWidth; dx <= edgeWidth; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          if (mask[(ny * width + nx) * 4] < 128) {
            nearEdge = true;
            break outer;
          }
        }
      }
      if (!nearEdge) continue;

      let r = 0;
      let g = 0;
      let b = 0;
      let ki = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = clamp(y + dy, 0, height - 1);
          const nx = clamp(x + dx, 0, width - 1);
          const pi = (ny * width + nx) * 4;
          const w = kernel[ki++];
          r += scratch[pi] * w;
          g += scratch[pi + 1] * w;
          b += scratch[pi + 2] * w;
        }
      }
      const pi = (y * width + x) * 4;
      data[pi] = clamp(r, 0, 255);
      data[pi + 1] = clamp(g, 0, 255);
      data[pi + 2] = clamp(b, 0, 255);
    }
  }
}

function sampleColor(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
): [number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function patchSSD(
  data: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  height: number,
  ps: number,
): number {
  let ssd = 0;
  let count = 0;
  const half = Math.floor(ps / 2);
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const nay = ay + dy;
      const nax = ax + dx;
      const nby = by + dy;
      const nbx = bx + dx;
      if (nay < 0 || nay >= height || nax < 0 || nax >= width) continue;
      if (nby < 0 || nby >= height || nbx < 0 || nbx >= width) continue;
      if (mask[(nay * width + nax) * 4] > 128) continue;
      const ai = (nay * width + nax) * 4;
      const bi = (nby * width + nbx) * 4;
      const dr = data[ai] - data[bi];
      const dg = data[ai + 1] - data[bi + 1];
      const db = data[ai + 2] - data[bi + 2];
      ssd += dr * dr + dg * dg + db * db;
      count++;
    }
  }
  return count === 0 ? Number.POSITIVE_INFINITY : ssd / count;
}

export async function aiEraseInpaint(
  imageData: ImageData,
  maskData: ImageData,
): Promise<ImageData> {
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const mask = maskData.data;

  const maskedPixels: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[(y * width + x) * 4] > 128) {
        maskedPixels.push([x, y]);
      }
    }
  }

  if (maskedPixels.length === 0) {
    return new ImageData(data, width, height);
  }

  const sourcePixels: Array<[number, number]> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[(y * width + x) * 4] > 128) continue;
      let inRing = false;
      for (const [mx, my] of maskedPixels) {
        const dx = x - mx;
        const dy = y - my;
        if (dx * dx + dy * dy <= SAMPLE_RING_WIDTH * SAMPLE_RING_WIDTH) {
          inRing = true;
          break;
        }
      }
      if (inRing) sourcePixels.push([x, y]);
    }
  }

  if (sourcePixels.length === 0) {
    for (let x = 0; x < width; x++) {
      sourcePixels.push([x, 0]);
      sourcePixels.push([x, height - 1]);
    }
    for (let y = 0; y < height; y++) {
      sourcePixels.push([0, y]);
      sourcePixels.push([width - 1, y]);
    }
  }

  const maxSources = 500;
  const step = Math.max(1, Math.floor(sourcePixels.length / maxSources));
  const sampledSources: Array<[number, number]> = [];
  for (let i = 0; i < sourcePixels.length; i += step) {
    sampledSources.push(sourcePixels[i]);
  }

  for (const [tx, ty] of maskedPixels) {
    let bestScore = Number.POSITIVE_INFINITY;
    let bestSrc: [number, number] = sampledSources[0] || [0, 0];

    for (const [sx, sy] of sampledSources) {
      const score = patchSSD(
        data,
        mask,
        tx,
        ty,
        sx,
        sy,
        width,
        height,
        PATCH_SIZE,
      );
      if (score < bestScore) {
        bestScore = score;
        bestSrc = [sx, sy];
      }
    }

    const [bx, by] = bestSrc;
    const [r, g, b] = sampleColor(data, bx, by, width);
    const pi = (ty * width + tx) * 4;
    data[pi] = r;
    data[pi + 1] = g;
    data[pi + 2] = b;
    data[pi + 3] = 255;
  }

  applyGaussianBlurOnMaskEdge(data, mask, width, height, 6);

  return new ImageData(data, width, height);
}

export function createBrushMask(width: number, height: number): ImageData {
  return new ImageData(width, height);
}

export function paintBrushStroke(
  maskCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  brushSize: number,
): void {
  maskCtx.fillStyle = "white";
  maskCtx.beginPath();
  maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
  maskCtx.fill();
}
