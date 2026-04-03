import { useEditorStore } from "@/store/editorStore";
import { useEffect } from "react";

const TOOL_SHORTCUTS: Record<string, string> = {
  v: "select",
  t: "text",
  i: "image",
  a: "aiErase",
  e: "erase",
  h: "highlight",
  d: "draw",
  s: "shape",
  b: "blur",
  x: "crop",
  k: "eyedropper",
  w: "watermark",
  p: "stamp",
  n: "note",
  c: "comment",
  g: "signature",
};

export function useKeyboardShortcuts(
  onShowShortcuts: () => void,
  onExport: () => void,
) {
  const {
    undo,
    redo,
    setTool,
    setZoom,
    zoom,
    selectedIds,
    removeElements,
    copyElements,
    pasteElements,
    duplicateElements,
    setSelectedIds,
    pages,
    currentPage,
    setCurrentPage,
    totalPages,
    setShowGrid,
    showGrid,
  } = useEditorStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't intercept when typing in input fields
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") (target as any).blur?.();
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl) {
        switch (key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            return;
          case "y":
            e.preventDefault();
            redo();
            return;
          case "c":
            e.preventDefault();
            if (selectedIds.length > 0) copyElements(selectedIds);
            return;
          case "v":
            e.preventDefault();
            pasteElements();
            return;
          case "d":
            e.preventDefault();
            if (selectedIds.length > 0) duplicateElements(selectedIds);
            return;
          case "a":
            e.preventDefault();
            {
              const allIds = (pages[currentPage]?.elements || []).map(
                (el) => el.id,
              );
              setSelectedIds(allIds);
            }
            return;
          case "s":
            e.preventDefault();
            onExport();
            return;
          case "=":
          case "+":
            e.preventDefault();
            setZoom(zoom + 0.25);
            return;
          case "-":
            e.preventDefault();
            setZoom(zoom - 0.25);
            return;
          case "0":
            e.preventDefault();
            setZoom(1);
            return;
        }
        return;
      }

      // Tool shortcuts
      if (TOOL_SHORTCUTS[key]) {
        e.preventDefault();
        setTool(TOOL_SHORTCUTS[key] as any);
        return;
      }

      switch (e.key) {
        case "?":
          onShowShortcuts();
          return;
        case "G":
          setShowGrid(!showGrid);
          return;
        case "Delete":
        case "Backspace":
          if (selectedIds.length > 0) {
            e.preventDefault();
            removeElements(selectedIds);
          }
          return;
        case "Escape":
          setSelectedIds([]);
          useEditorStore.getState().setEditingTextId(null);
          return;
        case "PageDown":
          e.preventDefault();
          setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
          return;
        case "PageUp":
          e.preventDefault();
          setCurrentPage(Math.max(0, currentPage - 1));
          return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    undo,
    redo,
    setTool,
    setZoom,
    zoom,
    selectedIds,
    removeElements,
    copyElements,
    pasteElements,
    duplicateElements,
    setSelectedIds,
    pages,
    currentPage,
    setCurrentPage,
    totalPages,
    setShowGrid,
    showGrid,
    onShowShortcuts,
    onExport,
  ]);
}
