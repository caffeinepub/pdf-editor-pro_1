import { generateId, useEditorStore } from "@/store/editorStore";
import type {
  AiEraseElement,
  BlurElement,
  CommentElement,
  DrawElement,
  EraseElement,
  HighlightElement,
  ImageInsertElement,
  NoteElement,
  OverlayElement,
  ShapeElement,
  SignatureElement,
  StampElement,
  TextElement,
  WatermarkElement,
} from "@/types/editor";
import { aiEraseInpaint, paintBrushStroke } from "@/utils/aiErase";
import {
  drawArrow,
  drawSelectionHandles,
  drawStar,
  getResizeHandleAt,
  hitTestElement,
  smoothPath,
} from "@/utils/canvasUtils";
import { applyPixelateEffect } from "@/utils/imageUtils";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface EditorCanvasProps {
  baseCanvas: HTMLCanvasElement | null; // pre-rendered page image
  pageIndex: number;
  width: number;
  height: number;
  zoom: number;
}

const STAMP_COLORS: Record<string, string> = {
  APPROVED: "#22c55e",
  DRAFT: "#64748b",
  CONFIDENTIAL: "#ef4444",
  REJECTED: "#ef4444",
  VOID: "#ef4444",
  "FOR REVIEW": "#f59e0b",
  PAID: "#22c55e",
  URGENT: "#ef4444",
};

export function EditorCanvas({
  baseCanvas,
  pageIndex,
  width,
  height,
  zoom: _zoom,
}: EditorCanvasProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    tool,
    pages,
    currentPage,
    selectedIds,
    editingTextId,
    showGrid,
    gridSize,
    activeColor,
    fillColor,
    strokeWidth,
    fontSize,
    fontFamily,
    bold,
    italic,
    underline,
    textAlign,
    shapeType,
    highlightColor,
    blurIntensity,
    brushSize,
    opacity,
    addElement,
    updateElement,
    setSelectedIds,
    setEditingTextId,
    pushHistory,
    showNotes,
    showComments,
  } = useEditorStore();

  const elements = pages[pageIndex]?.elements || [];
  const isCurrentPage = pageIndex === currentPage;

  // Interaction state
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEl, setDragEl] = useState<{
    id: string;
    ox: number;
    oy: number;
  } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeEl, setResizeEl] = useState<{
    id: string;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [drawPoints, setDrawPoints] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  const [shapePreview, setShapePreview] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [brushPath, setBrushPath] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  const [aiProcessing, setAiProcessing] = useState(false);
  const [textPos, setTextPos] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeInput, setActiveInput] = useState<null | "note" | "comment">(
    null,
  );
  const [inputPos, setInputPos] = useState({ x: 0, y: 0 });

  // -- Draw overlay --
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw base page
    if (baseCanvas) {
      ctx.drawImage(baseCanvas, 0, 0, canvas.width, canvas.height);
    }

    // Grid
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      const gs = gridSize;
      for (let x = 0; x < canvas.width; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw elements
    for (const el of elements) {
      if (!el.visible) continue;
      ctx.save();
      ctx.globalAlpha = el.opacity;

      const { x, y, width: w, height: h } = el;

      // Apply rotation around element center
      if (el.rotation) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }

      switch (el.type) {
        case "erase": {
          ctx.fillStyle = el.fillColor || "#ffffff";
          ctx.fillRect(x, y, w, h);
          break;
        }
        case "aiErase": {
          if (el.imageData) {
            const img = new Image();
            img.src = el.imageData;
            ctx.drawImage(img, x, y, w, h);
          }
          break;
        }
        case "highlight": {
          ctx.globalAlpha = el.opacity * 0.45;
          ctx.fillStyle = el.color;
          ctx.fillRect(x, y, w, h);
          break;
        }
        case "blur": {
          // Pixelate region from base canvas
          if (baseCanvas) {
            const tempCtx = document.createElement("canvas");
            tempCtx.width = Math.max(1, w);
            tempCtx.height = Math.max(1, h);
            const tc = tempCtx.getContext("2d")!;
            tc.drawImage(baseCanvas, x, y, w, h, 0, 0, w, h);
            const blockSize = Math.max(2, Math.floor(el.intensity));
            applyPixelateEffect(tc, 0, 0, w, h, blockSize);
            ctx.drawImage(tempCtx, x, y, w, h);
          } else {
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(x, y, w, h);
          }
          break;
        }
        case "text": {
          const textEl = el as TextElement;
          const paddingX = 4;
          // Background
          if (textEl.bgOpacity > 0) {
            ctx.globalAlpha = el.opacity * textEl.bgOpacity;
            ctx.fillStyle = textEl.bgColor;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = el.opacity;
          }
          const style = `${textEl.italic ? "italic " : ""}${textEl.bold ? "bold " : ""}${textEl.fontSize}px ${textEl.fontFamily}`;
          ctx.font = style;
          ctx.fillStyle = textEl.color;
          ctx.textAlign = textEl.align as CanvasTextAlign;
          const textX =
            textEl.align === "center"
              ? x + w / 2
              : textEl.align === "right"
                ? x + w - paddingX
                : x + paddingX;
          let lineY = y + textEl.fontSize;
          const lines = textEl.text.split("\n");
          for (const line of lines) {
            if (editingTextId !== textEl.id) {
              ctx.fillText(line, textX, lineY);
              if (textEl.underline) {
                const metrics = ctx.measureText(line);
                const lx =
                  textEl.align === "center"
                    ? textX - metrics.width / 2
                    : textEl.align === "right"
                      ? textX - metrics.width
                      : textX;
                ctx.beginPath();
                ctx.moveTo(lx, lineY + 2);
                ctx.lineTo(lx + metrics.width, lineY + 2);
                ctx.strokeStyle = textEl.color;
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
            lineY += textEl.fontSize * 1.4;
          }
          break;
        }
        case "imageInsert": {
          const img = new Image();
          img.src = el.dataUrl;
          ctx.drawImage(img, x, y, w, h);
          break;
        }
        case "draw": {
          const drawEl = el as DrawElement;
          if (drawEl.points.length < 2) break;
          ctx.strokeStyle = drawEl.color;
          ctx.lineWidth = drawEl.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(drawEl.points[0].x, drawEl.points[0].y);
          for (let i = 1; i < drawEl.points.length - 1; i++) {
            const mx = (drawEl.points[i].x + drawEl.points[i + 1].x) / 2;
            const my = (drawEl.points[i].y + drawEl.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(
              drawEl.points[i].x,
              drawEl.points[i].y,
              mx,
              my,
            );
          }
          ctx.lineTo(
            drawEl.points[drawEl.points.length - 1].x,
            drawEl.points[drawEl.points.length - 1].y,
          );
          ctx.stroke();
          break;
        }
        case "shape": {
          const shapeEl = el as ShapeElement;
          ctx.strokeStyle = shapeEl.strokeColor;
          ctx.lineWidth = shapeEl.strokeWidth;
          ctx.fillStyle = shapeEl.fillColor;
          switch (shapeEl.shapeType) {
            case "rect":
              ctx.fillRect(x, y, w, h);
              ctx.strokeRect(x, y, w, h);
              break;
            case "ellipse":
              ctx.beginPath();
              ctx.ellipse(
                x + w / 2,
                y + h / 2,
                w / 2,
                h / 2,
                0,
                0,
                Math.PI * 2,
              );
              ctx.fill();
              ctx.stroke();
              break;
            case "line":
              ctx.beginPath();
              ctx.moveTo(x, y + h / 2);
              ctx.lineTo(x + w, y + h / 2);
              ctx.stroke();
              break;
            case "arrow":
              ctx.strokeStyle = shapeEl.strokeColor;
              ctx.lineWidth = shapeEl.strokeWidth;
              drawArrow(ctx, x, y + h / 2, x + w, y + h / 2);
              break;
            case "triangle":
              ctx.beginPath();
              ctx.moveTo(x + w / 2, y);
              ctx.lineTo(x + w, y + h);
              ctx.lineTo(x, y + h);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              break;
            case "star":
              ctx.beginPath();
              drawStar(
                ctx,
                x + w / 2,
                y + h / 2,
                Math.min(w, h) / 2,
                Math.min(w, h) / 4,
                5,
              );
              ctx.fill();
              ctx.stroke();
              break;
          }
          break;
        }
        case "stamp": {
          const stampEl = el as StampElement;
          ctx.strokeStyle = stampEl.color;
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
          ctx.font = `bold ${Math.min((w / stampEl.text.length) * 1.2, h * 0.5)}px monospace`;
          ctx.fillStyle = stampEl.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(stampEl.text, x + w / 2, y + h / 2);
          ctx.textBaseline = "alphabetic";
          break;
        }
        case "watermark": {
          const wmEl = el as WatermarkElement;
          ctx.save();
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate((wmEl.angle * Math.PI) / 180);
          ctx.font = `bold ${wmEl.fontSize}px sans-serif`;
          ctx.fillStyle = wmEl.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.globalAlpha = el.opacity * 0.35;
          ctx.fillText(wmEl.text, 0, 0);
          ctx.restore();
          break;
        }
        case "signature": {
          const sigEl = el as SignatureElement;
          const img = new Image();
          img.src = sigEl.dataUrl;
          ctx.drawImage(img, x, y, w, h);
          break;
        }
        case "note": {
          if (!showNotes) break;
          const noteEl = el as NoteElement;
          ctx.fillStyle = noteEl.color;
          ctx.beginPath();
          ctx.roundRect(x, y, w, noteEl.collapsed ? 28 : h, 6);
          ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("📝", x + 4, y + 18);
          if (!noteEl.collapsed) {
            ctx.font = "11px sans-serif";
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            const lines = noteEl.text.split("\n");
            let ly = y + 32;
            for (const line of lines) {
              ctx.fillText(line, x + 4, ly);
              ly += 14;
            }
          }
          break;
        }
        case "comment": {
          if (!showComments) break;
          const cmtEl = el as CommentElement;
          ctx.fillStyle = cmtEl.resolved ? "#6b7280" : "#3b82f6";
          ctx.beginPath();
          ctx.arc(x + 10, y + 10, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("!", x + 10, y + 10);
          ctx.textBaseline = "alphabetic";
          break;
        }
      }
      ctx.restore();

      // Selection handles
      if (isCurrentPage && selectedIds.includes(el.id) && !el.locked) {
        drawSelectionHandles(ctx, x, y, el.width, el.height, el.rotation);
      }
    }

    // Draw in-progress draw stroke
    if (isCurrentPage && tool === "draw" && drawPoints.length > 1) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
      for (const p of drawPoints.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Draw shape preview
    if (
      isCurrentPage &&
      shapePreview &&
      (tool === "shape" ||
        tool === "erase" ||
        tool === "highlight" ||
        tool === "blur" ||
        tool === "crop")
    ) {
      const { x: px, y: py, w: pw, h: ph } = shapePreview;
      ctx.strokeStyle =
        tool === "erase"
          ? "#94a3b8"
          : tool === "blur"
            ? "#818cf8"
            : activeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(px, py, pw, ph);
      ctx.setLineDash([]);
    }

    // Draw AI brush overlay
    if (isCurrentPage && tool === "aiErase" && brushPath.length > 0) {
      const mask = maskRef.current;
      if (mask) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(mask, 0, 0);
        ctx.restore();
      }
    }
  }, [
    elements,
    selectedIds,
    editingTextId,
    showGrid,
    gridSize,
    baseCanvas,
    isCurrentPage,
    tool,
    drawPoints,
    shapePreview,
    brushPath,
    activeColor,
    strokeWidth,
    showNotes,
    showComments,
  ]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): {
    x: number;
    y: number;
  } {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  async function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isCurrentPage) return;
    const pos = getCanvasPos(e);

    if (tool === "select") {
      // Find element at pos
      const reversed = [...elements].reverse();
      const hit = reversed.find(
        (el) => hitTestElement(el, pos.x, pos.y) && !el.locked,
      );

      if (hit) {
        // Check for resize handle
        const handle = getResizeHandleAt(
          pos.x,
          pos.y,
          hit.x,
          hit.y,
          hit.width,
          hit.height,
        );
        if (handle && selectedIds.includes(hit.id)) {
          setResizeHandle(handle);
          setResizeEl({
            id: hit.id,
            origX: hit.x,
            origY: hit.y,
            origW: hit.width,
            origH: hit.height,
            startX: pos.x,
            startY: pos.y,
          });
          return;
        }

        if (e.shiftKey) {
          setSelectedIds([...selectedIds, hit.id]);
        } else if (!selectedIds.includes(hit.id)) {
          setSelectedIds([hit.id]);
        }
        setDragEl({ id: hit.id, ox: pos.x - hit.x, oy: pos.y - hit.y });
        setDragging(true);
        setDragStart(pos);
      } else {
        if (!e.shiftKey) setSelectedIds([]);
        setEditingTextId(null);
      }
      return;
    }

    if (tool === "text") {
      // Start text placement
      setTextPos({ x: pos.x, y: pos.y, w: 200, h: 60 });
      setDragStart(pos);
      setDragging(true);
      return;
    }

    if (tool === "draw") {
      setDrawPoints([pos]);
      setDragging(true);
      return;
    }

    if (tool === "aiErase") {
      const mask = maskRef.current;
      if (!mask) return;
      const mCtx = mask.getContext("2d")!;
      paintBrushStroke(mCtx, pos.x, pos.y, brushSize);
      setBrushPath([pos]);
      setDragging(true);
      return;
    }

    if (
      ["erase", "highlight", "blur", "shape", "crop", "watermark"].includes(
        tool,
      )
    ) {
      setDragStart(pos);
      setDragging(true);
      setShapePreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }

    if (tool === "note") {
      setInputPos(pos);
      setActiveInput("note");
      setNoteText("");
      return;
    }

    if (tool === "comment") {
      setInputPos(pos);
      setActiveInput("comment");
      setCommentText("");
      return;
    }

    if (tool === "stamp") {
      // Show stamp selector -- for now place default stamp
      const stampTexts = [
        "APPROVED",
        "DRAFT",
        "CONFIDENTIAL",
        "REJECTED",
        "VOID",
        "FOR REVIEW",
        "PAID",
        "URGENT",
      ];
      const text = stampTexts[0];
      const stamp: StampElement = {
        id: generateId(),
        type: "stamp",
        pageIndex,
        x: pos.x - 60,
        y: pos.y - 20,
        width: 120,
        height: 40,
        text,
        color: STAMP_COLORS[text] || "#ef4444",
        opacity: 1,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(stamp, "Add stamp");
      return;
    }

    if (tool === "eyedropper") {
      // Sample color from base canvas
      if (baseCanvas) {
        const bCtx = baseCanvas.getContext("2d")!;
        const id = bCtx.getImageData(
          Math.floor(pos.x),
          Math.floor(pos.y),
          1,
          1,
        );
        const r = id.data[0];
        const g = id.data[1];
        const b = id.data[2];
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        useEditorStore.getState().setActiveColor(hex);
        toast.success(`Color sampled: ${hex}`);
      }
      return;
    }

    if (tool === "image") {
      // Trigger file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const aspect = img.width / img.height;
            const w = Math.min(300, img.width);
            const el: ImageInsertElement = {
              id: generateId(),
              type: "imageInsert",
              pageIndex,
              x: pos.x - w / 2,
              y: pos.y - w / aspect / 2,
              width: w,
              height: w / aspect,
              dataUrl,
              opacity: 1,
              rotation: 0,
              locked: false,
              visible: true,
              createdAt: Date.now(),
            };
            addElement(el, "Insert image");
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    if (tool === "signature") {
      // Handled by parent via dialog
      return;
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isCurrentPage || !dragging) return;
    const pos = getCanvasPos(e);

    if (tool === "select" && dragEl) {
      const newX = pos.x - dragEl.ox;
      const newY = pos.y - dragEl.oy;
      updateElement(dragEl.id, { x: newX, y: newY });
      return;
    }

    if (tool === "select" && resizeEl && resizeHandle) {
      const dx = pos.x - resizeEl.startX;
      const dy = pos.y - resizeEl.startY;
      let { origX: nx, origY: ny, origW: nw, origH: nh } = resizeEl;
      if (resizeHandle.includes("e")) nw = Math.max(20, resizeEl.origW + dx);
      if (resizeHandle.includes("s")) nh = Math.max(20, resizeEl.origH + dy);
      if (resizeHandle.includes("w")) {
        nx = resizeEl.origX + dx;
        nw = Math.max(20, resizeEl.origW - dx);
      }
      if (resizeHandle.includes("n")) {
        ny = resizeEl.origY + dy;
        nh = Math.max(20, resizeEl.origH - dy);
      }
      updateElement(resizeEl.id, { x: nx, y: ny, width: nw, height: nh });
      return;
    }

    if (tool === "draw") {
      setDrawPoints((prev) => [...prev, pos]);
      return;
    }

    if (tool === "aiErase") {
      const mask = maskRef.current;
      if (!mask) return;
      const mCtx = mask.getContext("2d")!;
      paintBrushStroke(mCtx, pos.x, pos.y, brushSize);
      setBrushPath((prev) => [...prev, pos]);
      return;
    }

    if (
      ["erase", "highlight", "blur", "shape", "crop", "watermark"].includes(
        tool,
      )
    ) {
      const x = Math.min(pos.x, dragStart.x);
      const y = Math.min(pos.y, dragStart.y);
      const w = Math.abs(pos.x - dragStart.x);
      const h = Math.abs(pos.y - dragStart.y);
      setShapePreview({ x, y, w, h });
    }

    if (tool === "text" && textPos) {
      const x = Math.min(pos.x, dragStart.x);
      const y = Math.min(pos.y, dragStart.y);
      const w = Math.abs(pos.x - dragStart.x) || 200;
      const h = Math.abs(pos.y - dragStart.y) || 60;
      setTextPos({ x, y, w, h });
    }
  }

  async function handleMouseUp(_e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isCurrentPage) return;

    if (tool === "select" && dragEl) {
      // Finalize move
      pushHistory("Move element");
    }
    if (resizeEl) {
      pushHistory("Resize element");
    }

    if (tool === "draw" && drawPoints.length > 1) {
      const smoothed = smoothPath(drawPoints);
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const p of smoothed) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const el: DrawElement = {
        id: generateId(),
        type: "draw",
        pageIndex,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        points: smoothed,
        color: activeColor,
        strokeWidth,
        opacity,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Draw stroke");
      setDrawPoints([]);
    }

    if (tool === "aiErase") {
      // Apply AI inpainting
      const mask = maskRef.current;
      const overlay = overlayRef.current;
      if (!mask || !overlay || brushPath.length === 0) {
        setDragging(false);
        setBrushPath([]);
        return;
      }
      setAiProcessing(true);
      try {
        const ctx = overlay.getContext("2d")!;
        const maskCtx = mask.getContext("2d")!;
        const maskData = maskCtx.getImageData(0, 0, mask.width, mask.height);

        // Find mask bounding box
        let mx1 = Number.POSITIVE_INFINITY;
        let my1 = Number.POSITIVE_INFINITY;
        let mx2 = Number.NEGATIVE_INFINITY;
        let my2 = Number.NEGATIVE_INFINITY;
        for (let y = 0; y < maskData.height; y++) {
          for (let x = 0; x < maskData.width; x++) {
            if (maskData.data[(y * maskData.width + x) * 4] > 128) {
              if (x < mx1) mx1 = x;
              if (y < my1) my1 = y;
              if (x > mx2) mx2 = x;
              if (y > my2) my2 = y;
            }
          }
        }

        if (mx2 >= mx1 && my2 >= my1) {
          const pad = 40;
          const rx = Math.max(0, mx1 - pad);
          const ry = Math.max(0, my1 - pad);
          const rw = Math.min(overlay.width - rx, mx2 - mx1 + pad * 2);
          const rh = Math.min(overlay.height - ry, my2 - my1 + pad * 2);

          // Crop region
          const regionData = ctx.getImageData(rx, ry, rw, rh);
          const maskRegion = maskCtx.getImageData(rx, ry, rw, rh);

          const filled = await aiEraseInpaint(regionData, maskRegion);

          // Save as canvas element
          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = rw;
          tmpCanvas.height = rh;
          const tmpCtx = tmpCanvas.getContext("2d")!;
          tmpCtx.putImageData(filled, 0, 0);
          const dataUrl = tmpCanvas.toDataURL("image/png");

          const aiEl: AiEraseElement = {
            id: generateId(),
            type: "aiErase",
            pageIndex,
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            imageData: dataUrl,
            opacity: 1,
            rotation: 0,
            locked: false,
            visible: true,
            createdAt: Date.now(),
          };
          addElement(aiEl, "AI Erase");
        }
      } catch (err) {
        console.error("AI Erase failed", err);
        toast.error("AI Erase failed");
      } finally {
        setAiProcessing(false);
        // Clear mask
        const mCtx = mask.getContext("2d")!;
        mCtx.clearRect(0, 0, mask.width, mask.height);
        setBrushPath([]);
      }
    }

    if (
      tool === "erase" &&
      shapePreview &&
      shapePreview.w > 2 &&
      shapePreview.h > 2
    ) {
      const el: EraseElement = {
        id: generateId(),
        type: "erase",
        pageIndex,
        x: shapePreview.x,
        y: shapePreview.y,
        width: shapePreview.w,
        height: shapePreview.h,
        fillColor: "#ffffff",
        opacity: 1,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Erase area");
    }

    if (
      tool === "highlight" &&
      shapePreview &&
      shapePreview.w > 2 &&
      shapePreview.h > 2
    ) {
      const el: HighlightElement = {
        id: generateId(),
        type: "highlight",
        pageIndex,
        x: shapePreview.x,
        y: shapePreview.y,
        width: shapePreview.w,
        height: shapePreview.h,
        color: highlightColor,
        opacity,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Add highlight");
    }

    if (
      tool === "blur" &&
      shapePreview &&
      shapePreview.w > 2 &&
      shapePreview.h > 2
    ) {
      const el: BlurElement = {
        id: generateId(),
        type: "blur",
        pageIndex,
        x: shapePreview.x,
        y: shapePreview.y,
        width: shapePreview.w,
        height: shapePreview.h,
        intensity: blurIntensity,
        opacity: 1,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Add blur/redact");
    }

    if (
      tool === "shape" &&
      shapePreview &&
      shapePreview.w > 2 &&
      shapePreview.h > 2
    ) {
      const el: ShapeElement = {
        id: generateId(),
        type: "shape",
        pageIndex,
        x: shapePreview.x,
        y: shapePreview.y,
        width: shapePreview.w,
        height: shapePreview.h,
        shapeType,
        fillColor: fillColor,
        strokeColor: activeColor,
        strokeWidth,
        opacity,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Add shape");
    }

    if (
      tool === "watermark" &&
      shapePreview &&
      shapePreview.w > 2 &&
      shapePreview.h > 2
    ) {
      const el: WatermarkElement = {
        id: generateId(),
        type: "watermark",
        pageIndex,
        x: shapePreview.x,
        y: shapePreview.y,
        width: shapePreview.w,
        height: shapePreview.h,
        text: "WATERMARK",
        fontSize: 48,
        color: activeColor,
        angle: -30,
        opacity: 0.4,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Add watermark");
    }

    if (tool === "text" && textPos) {
      // Place text box
      const el: TextElement = {
        id: generateId(),
        type: "text",
        pageIndex,
        x: textPos.x,
        y: textPos.y,
        width: Math.max(textPos.w, 60),
        height: Math.max(textPos.h, 30),
        text: "",
        fontSize,
        fontFamily,
        color: activeColor,
        bold,
        italic,
        underline,
        align: textAlign,
        bgColor: "transparent",
        bgOpacity: 0,
        opacity: 1,
        rotation: 0,
        locked: false,
        visible: true,
        createdAt: Date.now(),
      };
      addElement(el, "Add text");
      setEditingTextId(el.id);
      setTextPos(null);
    }

    setDragging(false);
    setDragEl(null);
    setResizeEl(null);
    setResizeHandle(null);
    setShapePreview(null);
  }

  function handleDoubleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isCurrentPage) return;
    const pos = getCanvasPos(e);
    const hit = [...elements]
      .reverse()
      .find((el) => el.type === "text" && hitTestElement(el, pos.x, pos.y));
    if (hit && hit.type === "text") {
      setEditingTextId(hit.id);
      setSelectedIds([hit.id]);
    }
  }

  // Text editing overlay
  const editingEl = editingTextId
    ? (elements.find((el) => el.id === editingTextId) as
        | TextElement
        | undefined)
    : undefined;

  return (
    <div ref={containerRef} className="relative" style={{ width, height }}>
      {/* Hidden mask canvas for AI erase */}
      <canvas
        ref={maskRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Main overlay canvas */}
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ cursor: getCursorForTool(tool) }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        data-ocid="editor.canvas_target"
      />

      {/* Inline text editor */}
      {editingEl && (
        <textarea
          ref={textInputRef}
          value={editingEl.text}
          onChange={(e) =>
            updateElement(editingEl.id, { text: e.target.value })
          }
          onBlur={() => {
            setEditingTextId(null);
            pushHistory("Edit text");
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          className="absolute border-2 border-primary outline-none resize-none bg-transparent"
          style={{
            left: editingEl.x,
            top: editingEl.y,
            width: editingEl.width,
            height: editingEl.height,
            fontSize: editingEl.fontSize,
            fontFamily: editingEl.fontFamily,
            fontWeight: editingEl.bold ? "bold" : "normal",
            fontStyle: editingEl.italic ? "italic" : "normal",
            color: editingEl.color,
            textAlign: editingEl.align,
            lineHeight: 1.4,
            padding: "0 4px",
          }}
        />
      )}

      {/* Note/Comment input overlay */}
      {activeInput && (
        <div
          className="absolute z-10 bg-popover border border-border rounded-lg shadow-panel p-2 space-y-2"
          style={{
            left: Math.min(inputPos.x, width - 240),
            top: Math.min(inputPos.y, height - 120),
            width: 220,
          }}
        >
          <textarea
            className="w-full text-xs bg-input border border-border rounded p-1 resize-none outline-none"
            rows={3}
            placeholder={
              activeInput === "note" ? "Enter note text..." : "Enter comment..."
            }
            value={activeInput === "note" ? noteText : commentText}
            onChange={(e) =>
              activeInput === "note"
                ? setNoteText(e.target.value)
                : setCommentText(e.target.value)
            }
            data-ocid={
              activeInput === "note" ? "note.textarea" : "comment.textarea"
            }
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent"
              onClick={() => setActiveInput(null)}
              data-ocid={`${activeInput}.cancel_button`}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
              onClick={() => {
                if (activeInput === "note") {
                  const el: NoteElement = {
                    id: generateId(),
                    type: "note",
                    pageIndex,
                    x: inputPos.x,
                    y: inputPos.y,
                    width: 160,
                    height: 100,
                    text: noteText,
                    color: "#fbbf24",
                    collapsed: false,
                    author: "Me",
                    opacity: 1,
                    rotation: 0,
                    locked: false,
                    visible: true,
                    createdAt: Date.now(),
                  };
                  addElement(el, "Add note");
                } else {
                  const el: CommentElement = {
                    id: generateId(),
                    type: "comment",
                    pageIndex,
                    x: inputPos.x,
                    y: inputPos.y,
                    width: 20,
                    height: 20,
                    text: commentText,
                    author: "You",
                    timestamp: Date.now(),
                    replies: [],
                    resolved: false,
                    opacity: 1,
                    rotation: 0,
                    locked: false,
                    visible: true,
                    createdAt: Date.now(),
                  };
                  addElement(el, "Add comment");
                  useEditorStore.getState().setRightPanelTab("comments");
                }
                setActiveInput(null);
              }}
              data-ocid={`${activeInput}.confirm_button`}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* AI Processing indicator */}
      {aiProcessing && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
          data-ocid="editor.ai_erase.loading_state"
        >
          <div className="bg-popover rounded-xl px-6 py-4 flex items-center gap-3 shadow-panel">
            <Loader2 className="animate-spin text-primary" size={20} />
            <div>
              <p className="text-sm font-semibold">AI Processing...</p>
              <p className="text-xs text-muted-foreground">
                Analyzing and filling region
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCursorForTool(tool: string): string {
  switch (tool) {
    case "select":
      return "default";
    case "text":
      return "text";
    case "draw":
      return "crosshair";
    case "aiErase":
      return "none";
    case "erase":
      return "crosshair";
    case "eyedropper":
      return "crosshair";
    case "crop":
      return "crosshair";
    default:
      return "crosshair";
  }
}
