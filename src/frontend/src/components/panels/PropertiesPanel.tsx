import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { useEditorStore } from "@/store/editorStore";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

const FONT_FAMILIES = [
  "Helvetica",
  "Times New Roman",
  "Courier",
  "Arial",
  "Georgia",
];
const HIGHLIGHT_COLORS = [
  "#fbbf24",
  "#4ade80",
  "#f472b6",
  "#60a5fa",
  "#fb923c",
];

export function PropertiesPanel() {
  const {
    tool,
    activeColor,
    fillColor,
    strokeWidth,
    fontSize,
    fontFamily,
    bold,
    italic,
    underline,
    textAlign,
    highlightColor,
    blurIntensity,
    brushSize,
    opacity,
    setActiveColor,
    setFillColor,
    setStrokeWidth,
    setFontSize,
    setFontFamily,
    setBold,
    setItalic,
    setUnderline,
    setTextAlign,
    setHighlightColor,
    setBlurIntensity,
    setBrushSize,
    setOpacity,
  } = useEditorStore();

  const sections: React.ReactNode[] = [];

  // ---- Color ----
  if (
    [
      "text",
      "draw",
      "shape",
      "erase",
      "highlight",
      "stamp",
      "watermark",
      "note",
    ].includes(tool)
  ) {
    sections.push(
      <Section key="color" label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={activeColor}
            onChange={(e) => setActiveColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
            data-ocid="props.color.input"
          />
          <Input
            value={activeColor}
            onChange={(e) => setActiveColor(e.target.value)}
            className="h-7 text-xs font-mono"
            maxLength={7}
          />
        </div>
      </Section>,
    );
  }

  // ---- Fill Color (shapes) ----
  if (tool === "shape") {
    sections.push(
      <Section key="fill" label="Fill Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fillColor.startsWith("rgba") ? "#ffffff" : fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border"
            data-ocid="props.fill.input"
          />
          <button
            type="button"
            onClick={() => setFillColor("rgba(0,0,0,0)")}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
          >
            None
          </button>
        </div>
      </Section>,
    );
  }

  // ---- Stroke width ----
  if (["draw", "shape"].includes(tool)) {
    sections.push(
      <Section key="stroke" label={`Stroke: ${strokeWidth}px`}>
        <Slider
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={([v]) => setStrokeWidth(v)}
          data-ocid="props.stroke.slider"
        />
      </Section>,
    );
  }

  // ---- Text formatting ----
  if (tool === "text") {
    sections.push(
      <Section key="font" label="Font">
        <Select value={fontFamily} onValueChange={setFontFamily}>
          <SelectTrigger className="h-7 text-xs" data-ocid="props.font.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>,
      <Section key="size" label={`Size: ${fontSize}px`}>
        <Slider
          min={6}
          max={96}
          step={1}
          value={[fontSize]}
          onValueChange={([v]) => setFontSize(v)}
          data-ocid="props.fontsize.slider"
        />
      </Section>,
      <Section key="style" label="Style">
        <div className="flex gap-1">
          <Toggle
            pressed={bold}
            onPressedChange={setBold}
            size="sm"
            className="h-7 w-7"
            data-ocid="props.bold.toggle"
          >
            <Bold size={12} />
          </Toggle>
          <Toggle
            pressed={italic}
            onPressedChange={setItalic}
            size="sm"
            className="h-7 w-7"
            data-ocid="props.italic.toggle"
          >
            <Italic size={12} />
          </Toggle>
          <Toggle
            pressed={underline}
            onPressedChange={setUnderline}
            size="sm"
            className="h-7 w-7"
            data-ocid="props.underline.toggle"
          >
            <Underline size={12} />
          </Toggle>
        </div>
      </Section>,
      <Section key="align" label="Alignment">
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setTextAlign(a)}
              className={`flex-1 py-1 rounded border text-xs flex items-center justify-center transition-colors ${
                textAlign === a
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              data-ocid={`props.align.${a}.button`}
            >
              {a === "left" ? (
                <AlignLeft size={12} />
              ) : a === "center" ? (
                <AlignCenter size={12} />
              ) : (
                <AlignRight size={12} />
              )}
            </button>
          ))}
        </div>
      </Section>,
    );
  }

  // ---- Highlight colors ----
  if (tool === "highlight") {
    sections.push(
      <Section key="hcolor" label="Highlight Color">
        <div className="flex gap-1 flex-wrap">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setHighlightColor(c)}
              className={`w-7 h-7 rounded border-2 transition-all ${
                highlightColor === c
                  ? "border-white scale-110"
                  : "border-transparent"
              }`}
              style={{ background: c }}
              data-ocid={`props.hcolor.${c}.button`}
            />
          ))}
        </div>
      </Section>,
    );
  }

  // ---- Blur intensity ----
  if (tool === "blur") {
    sections.push(
      <Section key="blur" label={`Blur: ${blurIntensity}px`}>
        <Slider
          min={2}
          max={40}
          step={1}
          value={[blurIntensity]}
          onValueChange={([v]) => setBlurIntensity(v)}
          data-ocid="props.blur.slider"
        />
      </Section>,
    );
  }

  // ---- Brush size (AI Erase) ----
  if (tool === "aiErase") {
    sections.push(
      <Section key="brush" label={`Brush Size: ${brushSize}px`}>
        <Slider
          min={10}
          max={120}
          step={5}
          value={[brushSize]}
          onValueChange={([v]) => setBrushSize(v)}
          data-ocid="props.brushsize.slider"
        />
      </Section>,
      <div
        key="ai-hint"
        className="px-3 py-2 bg-primary/10 rounded-lg text-xs text-primary border border-primary/20"
      >
        <p className="font-semibold mb-1">✨ AI Erase</p>
        <p>
          Paint over text or content to erase. Release to apply AI inpainting.
        </p>
      </div>,
    );
  }

  // ---- Opacity ----
  if (
    ["text", "draw", "shape", "highlight", "imageInsert", "note"].includes(tool)
  ) {
    sections.push(
      <Section key="opacity" label={`Opacity: ${Math.round(opacity * 100)}%`}>
        <Slider
          min={0.1}
          max={1}
          step={0.05}
          value={[opacity]}
          onValueChange={([v]) => setOpacity(v)}
          data-ocid="props.opacity.slider"
        />
      </Section>,
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium">Properties</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-3">
            Select a tool to see properties
          </p>
        ) : (
          <div className="p-3 space-y-4">{sections}</div>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}
