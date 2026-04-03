// Canvas drawing utilities for overlay elements

import type { OverlayElement } from "../types/editor";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  zoom: number,
): void {
  const size = gridSize * zoom;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-(w / 2), -(h / 2));

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(-1, -1, w + 2, h + 2);
  ctx.setLineDash([]);

  const handleSize = 8;
  const handles = [
    [-1, -1],
    [w / 2 - handleSize / 2, -1],
    [w + 1 - handleSize, -1],
    [-1, h / 2 - handleSize / 2],
    [w + 1 - handleSize, h / 2 - handleSize / 2],
    [-1, h + 1 - handleSize],
    [w / 2 - handleSize / 2, h + 1 - handleSize],
    [w + 1 - handleSize, h + 1 - handleSize],
  ];

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  for (const [hx, hy] of handles) {
    ctx.fillRect(hx, hy, handleSize, handleSize);
    ctx.strokeRect(hx, hy, handleSize, handleSize);
  }

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2, -1);
  ctx.lineTo(w / 2, -20);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#60a5fa";
  ctx.beginPath();
  ctx.arc(w / 2, -24, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function getResizeHandleAt(
  ex: number,
  ey: number,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  const handles: Record<string, [number, number]> = {
    nw: [x, y],
    n: [x + w / 2, y],
    ne: [x + w, y],
    w: [x, y + h / 2],
    e: [x + w, y + h / 2],
    sw: [x, y + h],
    s: [x + w / 2, y + h],
    se: [x + w, y + h],
  };
  for (const [key, [hx, hy]] of Object.entries(handles)) {
    if (Math.abs(ex - hx) <= 8 && Math.abs(ey - hy) <= 8) return key;
  }
  return null;
}

export function hitTestElement(
  el: OverlayElement,
  ex: number,
  ey: number,
): boolean {
  if (el.type === "draw") {
    const pts = el.points;
    if (pts.length === 0) return false;
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return ex >= minX - 5 && ex <= maxX + 5 && ey >= minY - 5 && ey <= maxY + 5;
  }
  return (
    ex >= el.x && ex <= el.x + el.width && ey >= el.y && ey <= el.y + el.height
  );
}

export function smoothPath(
  points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;
  const result: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    result.push({
      x: (points[i - 1].x + points[i].x + points[i + 1].x) / 3,
      y: (points[i - 1].y + points[i].y + points[i + 1].y) / 3,
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const headLen = 15;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}
