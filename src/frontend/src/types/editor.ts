// ─── Tool types ─────────────────────────────────────────────────────────────

export type ToolType =
  | "select"
  | "text"
  | "image"
  | "erase"
  | "aiErase"
  | "highlight"
  | "draw"
  | "shape"
  | "blur"
  | "crop"
  | "eyedropper"
  | "watermark"
  | "stamp"
  | "note"
  | "signature"
  | "comment";

export type ShapeType =
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "triangle"
  | "star";

export type EditorMode = "pdf" | "image";

// ─── Base element ────────────────────────────────────────────────────────────

interface BaseElement {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  visible: boolean;
  createdAt: number;
}

// ─── Element types ───────────────────────────────────────────────────────────

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  bgColor: string;
  bgOpacity: number;
}

export interface EraseElement extends BaseElement {
  type: "erase";
  fillColor: string;
}

export interface AiEraseElement extends BaseElement {
  type: "aiErase";
  imageData: string; // base64 PNG of inpainted region
}

export interface ImageInsertElement extends BaseElement {
  type: "imageInsert";
  dataUrl: string;
}

export interface HighlightElement extends BaseElement {
  type: "highlight";
  color: string;
}

export interface DrawElement extends BaseElement {
  type: "draw";
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: ShapeType;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface BlurElement extends BaseElement {
  type: "blur";
  intensity: number;
}

export interface WatermarkElement extends BaseElement {
  type: "watermark";
  text: string;
  fontSize: number;
  color: string;
  angle: number;
}

export interface StampElement extends BaseElement {
  type: "stamp";
  text: string;
  color: string;
}

export interface NoteElement extends BaseElement {
  type: "note";
  text: string;
  color: string;
  collapsed: boolean;
  author: string;
}

export interface SignatureElement extends BaseElement {
  type: "signature";
  dataUrl: string;
}

export interface CommentElement extends BaseElement {
  type: "comment";
  text: string;
  author: string;
  timestamp: number;
  replies: Array<{ author: string; text: string; timestamp: number }>;
  resolved: boolean;
}

export interface FormFieldElement extends BaseElement {
  type: "formField";
  fieldType: "text" | "checkbox" | "radio";
  fieldName: string;
  value: string;
  checked: boolean;
}

export type OverlayElement =
  | TextElement
  | EraseElement
  | AiEraseElement
  | ImageInsertElement
  | HighlightElement
  | DrawElement
  | ShapeElement
  | BlurElement
  | WatermarkElement
  | StampElement
  | NoteElement
  | SignatureElement
  | CommentElement
  | FormFieldElement;

// ─── Page state ──────────────────────────────────────────────────────────────

export interface PageState {
  rotation: number;
  elements: OverlayElement[];
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  timestamp: number;
  description: string;
  pages: PageState[];
}

export interface ClipboardData {
  elements: OverlayElement[];
}

export interface EditorState {
  mode: EditorMode;
  tool: ToolType;
  activeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: "left" | "center" | "right";
  shapeType: ShapeType;
  highlightColor: string;
  blurIntensity: number;
  brushSize: number;
  opacity: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;
  selectedIds: string[];
  editingTextId: string | null;
  currentPage: number;
  totalPages: number;
  pages: PageState[];
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: ClipboardData | null;
  showNotes: boolean;
  showComments: boolean;
  rightPanelTab: "properties" | "layers" | "history" | "comments";
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;
}
