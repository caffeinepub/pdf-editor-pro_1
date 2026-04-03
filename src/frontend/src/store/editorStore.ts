import { create } from "zustand";
import type {
  ClipboardData,
  EditorMode,
  EditorState,
  HistoryEntry,
  OverlayElement,
  PageState,
  ShapeType,
  ToolType,
} from "../types/editor";

function makeInitialPage(): PageState {
  return { rotation: 0, elements: [] };
}

function makeHistoryEntry(
  pages: PageState[],
  description: string,
): HistoryEntry {
  return {
    timestamp: Date.now(),
    description,
    pages: JSON.parse(JSON.stringify(pages)),
  };
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

interface EditorStore extends EditorState {
  // Mode
  setMode: (mode: EditorMode) => void;
  // Tools
  setTool: (tool: ToolType) => void;
  setActiveColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setFontSize: (s: number) => void;
  setFontFamily: (f: string) => void;
  setBold: (v: boolean) => void;
  setItalic: (v: boolean) => void;
  setUnderline: (v: boolean) => void;
  setTextAlign: (a: "left" | "center" | "right") => void;
  setShapeType: (t: ShapeType) => void;
  setHighlightColor: (c: string) => void;
  setBlurIntensity: (v: number) => void;
  setBrushSize: (v: number) => void;
  setOpacity: (v: number) => void;
  // Grid
  setShowGrid: (v: boolean) => void;
  setSnapToGrid: (v: boolean) => void;
  // Zoom/Pan
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  // Selection
  setSelectedIds: (ids: string[]) => void;
  setEditingTextId: (id: string | null) => void;
  // Pages
  setCurrentPage: (p: number) => void;
  initPages: (count: number) => void;
  // Elements (with history)
  addElement: (el: OverlayElement, description?: string) => void;
  updateElement: (
    id: string,
    updates: Partial<OverlayElement>,
    pushHistory?: boolean,
  ) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  // Page management
  rotatePage: (pageIndex: number, direction: "cw" | "ccw") => void;
  addBlankPage: (afterIndex: number) => void;
  deletePage: (pageIndex: number) => void;
  reorderPages: (newOrder: number[]) => void;
  // History
  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;
  jumpToHistory: (index: number) => void;
  // Clipboard
  copyElements: (ids: string[]) => void;
  pasteElements: () => void;
  // Notes visibility
  setShowNotes: (v: boolean) => void;
  // Comments visibility
  setShowComments: (v: boolean) => void;
  // Right panel
  setRightPanelTab: (tab: EditorState["rightPanelTab"]) => void;
  setLeftSidebarOpen: (v: boolean) => void;
  setRightPanelOpen: (v: boolean) => void;
  // Clipboard
  setClipboard: (data: ClipboardData | null) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  mode: "pdf",
  tool: "select",
  activeColor: "#000000",
  fillColor: "rgba(0,0,0,0)",
  strokeWidth: 2,
  fontSize: 14,
  fontFamily: "Helvetica",
  bold: false,
  italic: false,
  underline: false,
  textAlign: "left",
  shapeType: "rect",
  highlightColor: "#fbbf24",
  blurIntensity: 8,
  brushSize: 30,
  opacity: 1,
  showGrid: false,
  snapToGrid: false,
  gridSize: 20,
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedIds: [],
  editingTextId: null,
  currentPage: 0,
  totalPages: 0,
  pages: [],
  history: [],
  historyIndex: -1,
  clipboard: null,
  showNotes: true,
  showComments: true,
  rightPanelTab: "properties",
  leftSidebarOpen: true,
  rightPanelOpen: true,

  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool, selectedIds: [], editingTextId: null }),
  setActiveColor: (activeColor) => set({ activeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setBold: (bold) => set({ bold }),
  setItalic: (italic) => set({ italic }),
  setUnderline: (underline) => set({ underline }),
  setTextAlign: (textAlign) => set({ textAlign }),
  setShapeType: (shapeType) => set({ shapeType }),
  setHighlightColor: (highlightColor) => set({ highlightColor }),
  setBlurIntensity: (blurIntensity) => set({ blurIntensity }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setOpacity: (opacity) => set({ opacity }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setEditingTextId: (editingTextId) => set({ editingTextId }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setShowNotes: (showNotes) => set({ showNotes }),
  setShowComments: (showComments) => set({ showComments }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  setLeftSidebarOpen: (leftSidebarOpen) => set({ leftSidebarOpen }),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setClipboard: (clipboard) => set({ clipboard }),

  initPages: (count) => {
    const pages = Array.from({ length: count }, makeInitialPage);
    const entry = makeHistoryEntry(pages, "Open document");
    set({
      pages,
      totalPages: count,
      currentPage: 0,
      history: [entry],
      historyIndex: 0,
      selectedIds: [],
    });
  },

  addElement: (el, description = "Add element") => {
    const s = get();
    const pages = s.pages.map((p, i) =>
      i === el.pageIndex ? { ...p, elements: [...p.elements, el] } : p,
    );
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, description);
    set({ pages, history: [...history, entry], historyIndex: history.length });
  },

  updateElement: (id, updates, pushHist = false) => {
    const s = get();
    const pages = s.pages.map((p) => ({
      ...p,
      elements: p.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el,
      ),
    })) as PageState[];
    if (pushHist) {
      const history = s.history.slice(0, s.historyIndex + 1);
      const entry = makeHistoryEntry(pages, "Edit element");
      set({
        pages,
        history: [...history, entry],
        historyIndex: history.length,
      });
    } else {
      set({ pages });
    }
  },

  removeElements: (ids) => {
    const s = get();
    const pages = s.pages.map((p) => ({
      ...p,
      elements: p.elements.filter((el) => !ids.includes(el.id)),
    }));
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, `Delete ${ids.length} element(s)`);
    set({
      pages,
      history: [...history, entry],
      historyIndex: history.length,
      selectedIds: s.selectedIds.filter((id) => !ids.includes(id)),
    });
  },

  duplicateElements: (ids) => {
    const s = get();
    const newElements: OverlayElement[] = [];
    const pages = s.pages.map((p) => {
      const dupes: OverlayElement[] = [];
      for (const el of p.elements) {
        if (ids.includes(el.id)) {
          const dupe = {
            ...JSON.parse(JSON.stringify(el)),
            id: generateId(),
            x: el.x + 20,
            y: el.y + 20,
            createdAt: Date.now(),
          };
          dupes.push(dupe);
          newElements.push(dupe);
        }
      }
      return { ...p, elements: [...p.elements, ...dupes] };
    });
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Duplicate element(s)");
    set({
      pages,
      history: [...history, entry],
      historyIndex: history.length,
      selectedIds: newElements.map((e) => e.id),
    });
  },

  rotatePage: (pageIndex, direction) => {
    const s = get();
    const pages = s.pages.map((p, i) => {
      if (i !== pageIndex) return p;
      const delta = direction === "cw" ? 90 : -90;
      return { ...p, rotation: (((p.rotation + delta) % 360) + 360) % 360 };
    });
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Rotate page");
    set({ pages, history: [...history, entry], historyIndex: history.length });
  },

  addBlankPage: (afterIndex) => {
    const s = get();
    const pages = [
      ...s.pages.slice(0, afterIndex + 1),
      makeInitialPage(),
      ...s.pages.slice(afterIndex + 1),
    ];
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Add blank page");
    set({
      pages,
      totalPages: pages.length,
      history: [...history, entry],
      historyIndex: history.length,
    });
  },

  deletePage: (pageIndex) => {
    const s = get();
    if (s.pages.length <= 1) return;
    const pages = s.pages.filter((_, i) => i !== pageIndex);
    const newCurrent = Math.min(s.currentPage, pages.length - 1);
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Delete page");
    set({
      pages,
      totalPages: pages.length,
      currentPage: newCurrent,
      history: [...history, entry],
      historyIndex: history.length,
    });
  },

  reorderPages: (newOrder) => {
    const s = get();
    const pages = newOrder.map((i) => s.pages[i]);
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Reorder pages");
    set({ pages, history: [...history, entry], historyIndex: history.length });
  },

  pushHistory: (description) => {
    const s = get();
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(s.pages, description);
    set({ history: [...history, entry], historyIndex: history.length });
  },

  undo: () => {
    const s = get();
    if (s.historyIndex <= 0) return;
    const newIndex = s.historyIndex - 1;
    const entry = s.history[newIndex];
    set({
      pages: JSON.parse(JSON.stringify(entry.pages)),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const newIndex = s.historyIndex + 1;
    const entry = s.history[newIndex];
    set({
      pages: JSON.parse(JSON.stringify(entry.pages)),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },

  jumpToHistory: (index) => {
    const s = get();
    const entry = s.history[index];
    if (!entry) return;
    set({
      pages: JSON.parse(JSON.stringify(entry.pages)),
      historyIndex: index,
      selectedIds: [],
    });
  },

  copyElements: (ids) => {
    const s = get();
    const elements: OverlayElement[] = [];
    for (const p of s.pages) {
      for (const el of p.elements) {
        if (ids.includes(el.id)) elements.push(JSON.parse(JSON.stringify(el)));
      }
    }
    set({ clipboard: { elements } });
  },

  pasteElements: () => {
    const s = get();
    if (!s.clipboard || s.clipboard.elements.length === 0) return;
    const newElements = s.clipboard.elements.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: generateId(),
      x: el.x + 20,
      y: el.y + 20,
      pageIndex: s.currentPage,
      createdAt: Date.now(),
    }));
    const pages = s.pages.map((p, i) =>
      i === s.currentPage
        ? { ...p, elements: [...p.elements, ...newElements] }
        : p,
    );
    const history = s.history.slice(0, s.historyIndex + 1);
    const entry = makeHistoryEntry(pages, "Paste element(s)");
    set({
      pages,
      history: [...history, entry],
      historyIndex: history.length,
      selectedIds: newElements.map((e) => e.id),
    });
  },
}));
