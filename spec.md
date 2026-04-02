# PDF Editor Pro

## Current State
A browser-based PDF editor with:
- Text overlays (add, edit, move, resize)
- Erase/cover tool (white rectangle overlay)
- Image placement (upload PNG/JPG and position)
- Select/move/resize elements
- Undo/redo history
- Zoom controls + fit-width
- Page thumbnail sidebar
- PDF export via pdf-lib
- Keyboard shortcuts (v, t, e, i, Ctrl+Z/Y, Delete, Escape)

## Requested Changes (Diff)

### Add
- **Highlight tool** (H): draw translucent colored rectangles to highlight content; color picker for highlight color; exported as translucent rect in PDF
- **Freehand draw tool** (D): SVG path drawing with configurable pen color and stroke width; renders as SVG overlay; exported as SVG image embedded in PDF
- **Shape tools**: rectangle, ellipse, line, arrow -- configurable stroke color, fill color, stroke width
- **Stamp tool**: pre-made stamps (APPROVED, DRAFT, CONFIDENTIAL, REJECTED, VOID, FOR REVIEW); placed as colored text overlays
- **Sticky notes / comments**: click to place a small note icon; expand on click to show/edit note text; exported as text annotation
- **Signature tool**: dedicated draw-pad dialog to draw a signature, then place it on the PDF (transparent background)
- **Multi-font support**: dropdown to select font family (Helvetica, Times Roman, Courier) for text tool
- **Text formatting**: bold toggle for text tool
- **Page management**: rotate page CW/CCW in sidebar per-page; delete current page; add blank page after current; exported correctly in PDF
- **Copy/Paste/Duplicate**: Ctrl+C / Ctrl+V / Ctrl+D to duplicate selected element
- **Multi-select**: Shift+click to select multiple elements; move as group
- **Grid / Snap to grid toggle**: optional 10px grid overlay with snap behavior
- **Opacity control**: slider for opacity of selected element (text, images, shapes)
- **Scroll wheel zoom**: Ctrl+scroll to zoom in/out on canvas area
- **Keyboard shortcut help panel**: ? key or button to show all shortcuts
- **Open new PDF without page refresh**: already present via toolbar upload button - ensure accessible
- **Page number jump input**: click page number text in toolbar to type target page

### Modify
- Toolbar expanded to include new tools (grouped: pointer/text, drawing, shapes, annotations, stamps)
- Types file updated with new element types: highlight, draw, shape, stamp, note, signature
- Export logic updated to handle all new element types
- Sidebar adds per-page rotate and delete buttons on hover

### Remove
- Nothing removed

## Implementation Plan
1. Extend `@/types/pdf.ts` with new types: HighlightElement, DrawElement, ShapeElement, StampElement, NoteElement, SignatureElement; update ToolType union
2. Update `PDFToolbar.tsx`: add tool groups for new tools, opacity slider for selected element, font family selector, stroke width input, shape sub-tool selector
3. Update `PDFEditor.tsx`:
   - Add state and handlers for all new tools
   - Freehand: track SVG path points on mousemove while mousedown, finalize on mouseup
   - Shape: preview rect/ellipse/line/arrow while dragging, finalize on mouseup
   - Stamp: click to place stamp text overlay
   - Note: click to place sticky note icon; click icon to expand/collapse note text
   - Signature: open SignaturePad dialog, draw signature, capture as dataUrl, then place as image element
   - Copy/paste: maintain clipboard state; Ctrl+C copies selectedId element; Ctrl+V pastes with offset
   - Multi-select: shift+click adds to selection set; drag moves all
   - Opacity: element-level opacity field; rendered with CSS opacity
   - Scroll zoom: addEventListener on container for wheel+ctrl
   - Page management: rotate (track per-page rotation in state, apply when rendering), delete page (filter elements and reindex), add blank page
4. Create `SignaturePadDialog.tsx`: modal with canvas for freehand signature capture; Clear and Confirm buttons; exports signature as PNG dataUrl
5. Create `ShortcutHelpPanel.tsx`: triggered by ? key or help button; lists all keyboard shortcuts in a dialog
6. Update `PDFSidebar.tsx`: add rotate CW/CCW and delete page buttons visible on thumbnail hover
7. Update export in `PDFEditor.tsx` to handle: highlights (translucent rects), draw paths (embed as PNG snapshot), shapes (rect/ellipse/line via pdf-lib primitives), stamps (text), notes (text), signatures (embedded PNG), page rotations, page deletions
