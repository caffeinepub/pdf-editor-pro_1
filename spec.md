# PDF Editor Pro

## Current State
New project — no existing code.

## Requested Changes (Diff)

### Add
- PDF upload (drag & drop or file picker)
- PDF rendering page by page using PDF.js
- Canvas-based overlay editor per page
- Add text tool: click anywhere on a page to place a text box
- Erase/cover tool: draw a white rectangle to hide/remove text or image regions
- Image insert tool: upload an image and place it on a page
- Selection/move tool: select, reposition, resize placed elements
- Undo/redo for all operations
- Page navigation (prev/next, thumbnail sidebar)
- Zoom in/out
- Export/download the final edited PDF using pdf-lib
- All editing happens client-side in the browser (no server-side PDF processing)

### Modify
N/A

### Remove
N/A

## Implementation Plan
1. Backend: minimal Motoko actor (no meaningful server logic needed; PDF editing is client-side)
2. Frontend dependencies: pdf-lib, pdfjs-dist for rendering and exporting
3. Build a multi-panel layout: sidebar (page thumbnails) + main canvas editor + toolbar
4. Implement tool system: Select, Add Text, Erase, Add Image
5. Track edit layers per page as JSON state; render overlays on top of PDF canvas
6. On export, use pdf-lib to embed all edits into the PDF bytes and trigger download
7. Support undo/redo via history stack
